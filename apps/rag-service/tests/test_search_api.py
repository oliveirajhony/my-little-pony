"""Testes da API de busca (FastAPI) com o caso de uso injetado por fake.

Define os secrets ANTES de importar o módulo da API (o composition root é
criado no import). Nenhum modelo real é carregado: a dependência é sobrescrita.
"""

import os

os.environ.setdefault("RAG_NEST_BASE_URL", "http://nest:3000")
os.environ.setdefault("RAG_NEST_SERVICE_TOKEN", "test-token")
os.environ.setdefault("RAG_SERVICE_API_TOKEN", "search-token")

from fastapi.testclient import TestClient  # noqa: E402

from rag_service.adapters.fakes import (  # noqa: E402
    FakeChunker,
    FakeDenseEmbedder,
    FakeDocumentSource,
    FakeSparseEmbedder,
    InMemoryVectorIndex,
    LexicalReranker,
)
from rag_service.adapters.inbound import search_api  # noqa: E402
from rag_service.application.use_cases import IndexDocument, SearchDocuments  # noqa: E402


def fake_search_use_case() -> SearchDocuments:
    index = InMemoryVectorIndex()
    IndexDocument(
        source=FakeDocumentSource(
            {"doc-1": "<h1>Café</h1><p>a lenda de Kaldi sobre a origem do café</p>"}
        ),
        chunker=FakeChunker(),
        dense=FakeDenseEmbedder(),
        sparse=FakeSparseEmbedder(),
        index=index,
    ).execute("doc-1", "owner-1", version=1)

    return SearchDocuments(
        dense=FakeDenseEmbedder(),
        sparse=FakeSparseEmbedder(),
        index=index,
        reranker=LexicalReranker(),
    )


search_api.app.dependency_overrides[search_api.get_search_use_case] = fake_search_use_case
client = TestClient(search_api.app)

AUTH = {"Authorization": "Bearer search-token"}


def test_health_is_public():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_metrics_endpoint_exposes_prometheus():
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "rag_search_requests_total" in response.text


def test_search_requires_service_token():
    # Sem token -> 401 (defesa em profundidade multi-tenant).
    response = client.post("/search", json={"query": "café", "ownerId": "owner-1"})
    assert response.status_code == 401


def test_search_rejects_wrong_token():
    response = client.post(
        "/search",
        json={"query": "café", "ownerId": "owner-1"},
        headers={"Authorization": "Bearer errado"},
    )
    assert response.status_code == 401


def test_search_returns_hits_in_contract_shape():
    response = client.post(
        "/search", json={"query": "origem do café Kaldi", "ownerId": "owner-1"}, headers=AUTH
    )

    assert response.status_code == 200
    body = response.json()
    assert body
    hit = body[0]
    assert set(hit.keys()) == {"documentId", "chunkId", "score", "snippet"}
    assert hit["documentId"] == "doc-1"


def test_search_is_scoped_to_owner():
    response = client.post(
        "/search", json={"query": "café", "ownerId": "owner-2"}, headers=AUTH
    )

    assert response.status_code == 200
    assert response.json() == []  # owner-2 não tem documentos
