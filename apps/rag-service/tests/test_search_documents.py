"""Testes do caso de uso SearchDocuments (busca multi-tenant + rerank)."""

from rag_service.adapters.fakes import (
    FakeChunker,
    FakeDenseEmbedder,
    FakeDocumentSource,
    FakeSparseEmbedder,
    InMemoryVectorIndex,
    LexicalReranker,
)
from rag_service.application.use_cases import IndexDocument, SearchDocuments
from rag_service.domain.models import SearchQuery

DOCS = {
    "doc-cafe": "<h1>Café</h1><p>a lenda de Kaldi na Etiópia sobre a origem do café</p>",
    "doc-cha": "<h1>Chá</h1><p>a cerimônia do chá verde no Japão</p>",
}


def seed():
    """Indexa dois documentos de donos diferentes e devolve o caso de busca."""
    index = InMemoryVectorIndex()
    indexer = IndexDocument(
        source=FakeDocumentSource(DOCS),
        chunker=FakeChunker(),
        dense=FakeDenseEmbedder(),
        sparse=FakeSparseEmbedder(),
        index=index,
    )
    indexer.execute("doc-cafe", "owner-1", version=1)
    indexer.execute("doc-cha", "owner-2", version=1)

    search = SearchDocuments(
        dense=FakeDenseEmbedder(),
        sparse=FakeSparseEmbedder(),
        index=index,
        reranker=LexicalReranker(),
    )
    return search


def test_finds_relevant_document_for_owner():
    search = seed()

    hits = search.execute(SearchQuery(query="origem do café Kaldi", owner_id="owner-1"))

    assert hits
    assert hits[0].document_id == "doc-cafe"
    assert hits[0].snippet


def test_search_is_scoped_to_owner():
    search = seed()

    # owner-1 não deve enxergar o documento do owner-2 (doc-cha).
    hits = search.execute(SearchQuery(query="cerimônia do chá", owner_id="owner-1"))

    assert all(hit.document_id != "doc-cha" for hit in hits)


def test_other_owner_sees_only_their_document():
    search = seed()

    hits = search.execute(SearchQuery(query="chá verde Japão", owner_id="owner-2"))

    assert hits
    assert all(hit.document_id == "doc-cha" for hit in hits)


def test_empty_query_returns_nothing():
    search = seed()

    assert search.execute(SearchQuery(query="   ", owner_id="owner-1")) == []


def test_top_k_limits_results():
    search = seed()

    hits = search.execute(SearchQuery(query="café", owner_id="owner-1", top_k=1))

    assert len(hits) <= 1
