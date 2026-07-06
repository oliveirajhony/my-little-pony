"""Adapter de entrada: API HTTP (FastAPI) de busca e RAG.

Contrato:
    POST /search { query, ownerId, filters } -> [{ documentId, chunkId, score, snippet, kind }]
    POST /answer { query, ownerId, filters } -> { answer, grounded, sources[] }

Os casos de uso são injetados via Depends para permitir override nos testes.
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from pydantic import BaseModel, Field
from starlette.concurrency import iterate_in_threadpool
from starlette.responses import StreamingResponse

from rag_service.adapters.inbound.sse import sse_line
from rag_service.adapters.inbound.stream_guard import QueueFullError, SingleFlightGuard
from rag_service.application.use_cases import AnswerQuestion, SearchDocuments
from rag_service.composition import Composition
from rag_service.config import get_settings
from rag_service.domain.models import AnswerSourcesEvent, SearchQuery
from rag_service.observability import SEARCH_LATENCY, SEARCH_REQUESTS


class SearchRequest(BaseModel):
    query: str
    ownerId: str
    filters: dict = Field(default_factory=dict)
    topK: int = 5


class SearchHitResponse(BaseModel):
    documentId: str
    chunkId: str
    score: float
    snippet: str
    kind: str = "native"


class AnswerRequest(BaseModel):
    query: str
    ownerId: str
    filters: dict = Field(default_factory=dict)


class AnswerSourceResponse(BaseModel):
    documentId: str
    chunkId: str
    score: float
    snippet: str
    kind: str = "native"


class AnswerResponse(BaseModel):
    answer: str
    grounded: bool
    sources: list[AnswerSourceResponse]


# Composition root do processo da API (adapters preguiçosos).
_composition = Composition(get_settings())

_stream_settings = get_settings()
_guard = SingleFlightGuard(
    limit=_stream_settings.llm_max_concurrency,
    max_depth=_stream_settings.stream_queue_max_depth,
    max_wait_s=_stream_settings.stream_queue_max_wait_s,
)
_SAFE_STREAM_ERROR = "Não consegui responder agora. Tente novamente em instantes."


def get_search_use_case() -> SearchDocuments:
    return _composition.search_documents()


def get_answer_use_case() -> AnswerQuestion:
    return _composition.answer_question()


def require_service_token(authorization: str | None = Header(default=None)) -> None:
    """Defesa em profundidade: o /search exige o token de serviço.

    Sem isso, o isolamento multi-tenant dependeria só do chamador enviar o
    ownerId certo — um vazamento entre tenants esperando acontecer.
    """
    expected = f"Bearer {get_settings().service_api_token}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


app = FastAPI(title="RAG Search Service", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/metrics")
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post(
    "/search",
    response_model=list[SearchHitResponse],
    dependencies=[Depends(require_service_token)],
)
def search(
    request: SearchRequest,
    use_case: SearchDocuments = Depends(get_search_use_case),
) -> list[SearchHitResponse]:
    SEARCH_REQUESTS.inc()
    with SEARCH_LATENCY.time():
        hits = use_case.execute(
            SearchQuery(
                query=request.query,
                owner_id=request.ownerId,
                filters=request.filters,
                top_k=request.topK,
            )
        )
    return [
        SearchHitResponse(
            documentId=hit.document_id,
            chunkId=hit.chunk_id,
            score=hit.score,
            snippet=hit.snippet,
            kind=hit.kind,
        )
        for hit in hits
    ]


@app.post(
    "/answer",
    response_model=AnswerResponse,
    dependencies=[Depends(require_service_token)],
)
def answer(
    request: AnswerRequest,
    use_case: AnswerQuestion = Depends(get_answer_use_case),
) -> AnswerResponse:
    result = use_case.execute(
        SearchQuery(query=request.query, owner_id=request.ownerId, filters=request.filters)
    )
    return AnswerResponse(
        answer=result.answer,
        grounded=result.grounded,
        sources=[
            AnswerSourceResponse(
                documentId=source.document_id,
                chunkId=source.chunk_id,
                score=source.score,
                snippet=source.snippet,
                kind=source.kind,
            )
            for source in result.sources
        ],
    )


@app.post("/answer/stream", dependencies=[Depends(require_service_token)])
async def answer_stream(
    request: AnswerRequest,
    http_request: Request,
    use_case: AnswerQuestion = Depends(get_answer_use_case),
) -> StreamingResponse:
    query = SearchQuery(query=request.query, owner_id=request.ownerId, filters=request.filters)

    async def events():
        try:
            async with _guard.slot() as position:
                if position > 0:
                    yield sse_line({"type": "status", "stage": "queued", "position": position})
                yield sse_line({"type": "status", "stage": "retrieving"})
                grounded = True
                async for ev in iterate_in_threadpool(use_case.stream(query)):
                    if await http_request.is_disconnected():
                        return  # solta o semáforo ao sair do `async with`
                    if isinstance(ev, AnswerSourcesEvent):
                        grounded = ev.grounded
                        yield sse_line({
                            "type": "sources", "grounded": ev.grounded,
                            "sources": [
                                {"documentId": s.document_id, "chunkId": s.chunk_id,
                                 "score": s.score, "snippet": s.snippet, "kind": s.kind}
                                for s in ev.sources
                            ],
                        })
                        yield sse_line({"type": "status", "stage": "generating"})
                    else:
                        yield sse_line({"type": "token", "text": ev.text})
                yield sse_line({"type": "done", "grounded": grounded})
        except QueueFullError:
            yield sse_line({"type": "error", "message": _SAFE_STREAM_ERROR})
        except Exception:
            yield sse_line({"type": "error", "message": _SAFE_STREAM_ERROR})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
