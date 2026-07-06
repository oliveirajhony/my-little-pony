"""Testes de integração do QdrantServerIndex (precisa do Qdrant no docker-compose).

Usa embedders fake (dim 64) para exercitar a lógica do adapter — filtro por
dono, fusão, delete e idempotência — sem carregar o bge-m3.
"""

import pytest
from qdrant_client import QdrantClient

from rag_service.adapters.fakes import FakeDenseEmbedder, FakeSparseEmbedder
from rag_service.adapters.outbound.qdrant_index import QdrantServerIndex
from rag_service.domain.models import Chunk, EmbeddedChunk

pytestmark = pytest.mark.integration

QDRANT_URL = "http://localhost:6333"
COLLECTION = "test_documents"

_dense = FakeDenseEmbedder()
_sparse = FakeSparseEmbedder()


def make_chunk(
    document_id: str, owner_id: str, chunk_id: str, text: str, version: int = 1
) -> EmbeddedChunk:
    return EmbeddedChunk(
        document_id=document_id,
        owner_id=owner_id,
        version=version,
        chunk=Chunk(chunk_id=chunk_id, index=1, text=text, contextualized_text=text),
        dense=_dense.embed_query(text),
        sparse=_sparse.embed_query(text),
    )


@pytest.fixture
def index():
    client = QdrantClient(url=QDRANT_URL)
    if client.collection_exists(COLLECTION):
        client.delete_collection(COLLECTION)

    idx = QdrantServerIndex(url=QDRANT_URL, collection=COLLECTION, dense_dim=64)
    yield idx

    client.delete_collection(COLLECTION)


def test_search_is_scoped_by_owner(index):
    index.upsert([make_chunk("doc-a", "owner-1", "chunk-1", "café origem etiópia kaldi")])
    index.upsert([make_chunk("doc-b", "owner-2", "chunk-1", "café origem etiópia kaldi")])

    hits = index.search(
        dense=_dense.embed_query("café origem"),
        sparse=_sparse.embed_query("café origem"),
        owner_id="owner-1",
        filters={},
        limit=10,
    )

    assert hits
    assert all(hit.document_id == "doc-a" for hit in hits)


def test_delete_document_removes_points(index):
    index.upsert([make_chunk("doc-a", "owner-1", "chunk-1", "café origem")])
    index.delete_document("doc-a")

    hits = index.search(
        dense=_dense.embed_query("café"),
        sparse=_sparse.embed_query("café"),
        owner_id="owner-1",
        filters={},
        limit=10,
    )

    assert hits == []


def test_reindex_is_idempotent(index):
    chunk = make_chunk("doc-a", "owner-1", "chunk-1", "café origem")

    index.delete_document("doc-a")
    index.upsert([chunk])
    index.delete_document("doc-a")
    index.upsert([chunk])

    count = index._client.count(collection_name=COLLECTION).count
    assert count == 1


def test_already_indexed_reports_existing_chunks(index):
    index.upsert(
        [
            make_chunk("doc-a", "owner-1", "chunk-1", "um", version=1),
            make_chunk("doc-a", "owner-1", "chunk-2", "dois", version=1),
        ]
    )

    found = index.already_indexed("doc-a", 1, ["chunk-1", "chunk-2", "chunk-3"])

    assert found == {"chunk-1", "chunk-2"}
    # Versão diferente não conta (base da retomada por versão).
    assert index.already_indexed("doc-a", 2, ["chunk-1"]) == set()


def test_count_reflects_document_chunks(index):
    index.upsert(
        [
            make_chunk("doc-a", "owner-1", "chunk-1", "um"),
            make_chunk("doc-a", "owner-1", "chunk-2", "dois"),
        ]
    )

    assert index.count("doc-a") == 2


def test_delete_other_versions_cleans_old(index):
    index.upsert([make_chunk("doc-a", "owner-1", "chunk-1", "velho", version=1)])
    index.upsert([make_chunk("doc-a", "owner-1", "chunk-1", "novo", version=2)])

    index.delete_other_versions("doc-a", keep_version=2)

    assert index.current_version("doc-a") == 2
    assert index.count("doc-a") == 1
