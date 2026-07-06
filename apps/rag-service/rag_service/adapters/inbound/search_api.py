"""Adapter de entrada: API HTTP (FastAPI) de busca e RAG.

Contrato:
    POST /search { query, ownerId, filters } -> [{ documentId, chunkId, score, snippet, kind }]
    POST /answer { query, ownerId, filters } -> { answer, grounded, sources[] }

Os casos de uso são injetados via Depends para permitir override nos testes.
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from pydantic import BaseModel, Field

from rag_service.application.use_cases import AnswerQuestion, SearchDocuments
from rag_service.composition import Composition
from rag_service.config import get_settings
from rag_service.domain.models import SearchQuery
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
