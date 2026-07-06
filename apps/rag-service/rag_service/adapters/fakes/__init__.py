"""Adapters fake (em memória) para testar o domínio sem infra."""

from rag_service.adapters.fakes.fakes import (
    FakeAnswerGenerator,
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
    "FakeAnswerGenerator",
    "FakeBlobStorage",
    "FakeChunker",
    "FakeDenseEmbedder",
    "FakeDocumentSource",
    "FakeSparseEmbedder",
    "InMemoryVectorIndex",
    "LexicalReranker",
    "RecordingPublisher",
]
