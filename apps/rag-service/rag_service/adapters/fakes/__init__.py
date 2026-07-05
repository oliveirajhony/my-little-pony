"""Adapters fake (em memória) para testar o domínio sem infra."""

from rag_service.adapters.fakes.fakes import (
    FakeBlobStorage,
    FakeChunker,
    FakeDenseEmbedder,
    FakeDocumentSource,
    FakeSparseEmbedder,
    InMemoryVectorIndex,
    LexicalReranker,
    RecordingPublisher,
)

__all__ = [
    "FakeBlobStorage",
    "FakeChunker",
    "FakeDenseEmbedder",
    "FakeDocumentSource",
    "FakeSparseEmbedder",
    "InMemoryVectorIndex",
    "LexicalReranker",
    "RecordingPublisher",
]
