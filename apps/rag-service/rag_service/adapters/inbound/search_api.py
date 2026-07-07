"""Adapter de entrada: API HTTP (FastAPI) de busca e RAG.

Contrato:
    POST /search { query, ownerId, filters } -> [{ documentId, chunkId, score, snippet, kind }]
    POST /answer { query, ownerId, filters } -> { answer, grounded, sources[] }

Os casos de uso são injetados via Depends para permitir override nos testes.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from pydantic import BaseModel, Field
from starlette.concurrency import iterate_in_threadpool, run_in_threadpool
from starlette.responses import StreamingResponse

from rag_service.adapters.inbound.sse import sse_line
from rag_service.adapters.inbound.stream_guard import QueueFullError, SingleFlightGuard
from rag_service.application.use_cases import AnswerQuestion, SearchDocuments
from rag_service.composition import Composition
from rag_service.config import get_settings
from rag_service.domain.models import AnswerSourcesEvent, SearchQuery
from rag_service.observability import (
    ANSWER_STREAM_ERRORS,
    ANSWER_STREAM_REQUESTS,
    SEARCH_LATENCY,
    SEARCH_REQUESTS,
)

logger = logging.getLogger(__name__)


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


# Composition root do processo da API (adapters preguiçosos). get_settings() é
# cacheado (lru_cache), então _settings é o mesmo objeto usado na composição.
_settings = get_settings()
_composition = Composition(_settings)

_guard = SingleFlightGuard(
    limit=_settings.llm_max_concurrency,
    max_depth=_settings.stream_queue_max_depth,
    max_wait_s=_settings.stream_queue_max_wait_s,
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
async def answer(
    request: AnswerRequest,
    use_case: AnswerQuestion = Depends(get_answer_use_case),
) -> AnswerResponse:
    query = SearchQuery(query=request.query, owner_id=request.ownerId, filters=request.filters)
    # Serializa pelo mesmo guard do streaming: sem isto, /answer roda no
    # threadpool e bate no LLM único em paralelo, driblando o limite de
    # concorrência que o /answer/stream respeita.
    try:
        async with _guard.slot():
            result = await run_in_threadpool(use_case.execute, query)
    except QueueFullError as exc:
        raise HTTPException(status_code=503, detail="busy") from exc
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
    idle_timeout = _settings.stream_idle_timeout_s

    async def events():
        ANSWER_STREAM_REQUESTS.inc()
        try:
            async with _guard.slot() as position:
                if position > 0:
                    yield sse_line({"type": "status", "stage": "queued", "position": position})
                yield sse_line({"type": "status", "stage": "retrieving"})
                grounded = True
                # Itera manualmente para (a) impor um idle timeout por evento — um
                # LLM travado não pode prender o slot indefinidamente — e (b)
                # garantir o fechamento do gerador (e do stream httpx) no finally.
                stream = iterate_in_threadpool(use_case.stream(query))
                try:
                    while True:
                        if await http_request.is_disconnected():
                            return  # solta o semáforo ao sair do `async with`
                        try:
                            ev = await asyncio.wait_for(stream.__anext__(), timeout=idle_timeout)
                        except StopAsyncIteration:
                            break
                        except TimeoutError:
                            logger.warning("answer stream idle timeout after %ss", idle_timeout)
                            ANSWER_STREAM_ERRORS.labels(reason="idle_timeout").inc()
                            yield sse_line({"type": "error", "message": _SAFE_STREAM_ERROR})
                            return
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
                finally:
                    await stream.aclose()
        except QueueFullError:
            ANSWER_STREAM_ERRORS.labels(reason="queue_full").inc()
            yield sse_line({"type": "error", "message": _SAFE_STREAM_ERROR})
        except Exception:
            # Nunca vaza detalhe interno pro cliente, mas registra o traceback:
            # sem isto, um bug real fica indistinguível de backpressure normal.
            logger.exception("answer stream failed")
            ANSWER_STREAM_ERRORS.labels(reason="internal").inc()
            yield sse_line({"type": "error", "message": _SAFE_STREAM_ERROR})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
