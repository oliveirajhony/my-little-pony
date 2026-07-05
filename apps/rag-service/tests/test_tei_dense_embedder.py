"""Testes do TeiDenseEmbedder com transporte HTTP mockado (sem serviço TEI real).

Prova que o seam de embeddings dedicado funciona: mesma porta DenseEmbedder,
implementação HTTP, testável.
"""

import httpx

from rag_service.adapters.outbound.tei_dense_embedder import TeiDenseEmbedder


def build(handler) -> TeiDenseEmbedder:
    http_client = httpx.Client(transport=httpx.MockTransport(handler))
    return TeiDenseEmbedder("http://tei:8080", client=http_client)


def test_embed_documents_posts_inputs_and_parses_vectors():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        seen["body"] = request.read()
        return httpx.Response(200, json=[[0.1, 0.2], [0.3, 0.4]])

    embedder = build(handler)
    vectors = embedder.embed_documents(["a", "b"])

    assert vectors == [[0.1, 0.2], [0.3, 0.4]]
    assert seen["path"] == "/embed"
    assert b"inputs" in seen["body"]


def test_embed_query_returns_single_vector():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[[0.5, 0.6, 0.7]])

    embedder = build(handler)

    assert embedder.embed_query("olá") == [0.5, 0.6, 0.7]
