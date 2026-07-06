"""Domínio puro: entidades e invariantes. Sem framework, sem I/O."""

from rag_service.domain.models import (
    Chunk,
    EmbeddedChunk,
    IndexResult,
    RawDocument,
    RawHit,
    SearchHit,
    SearchQuery,
    SparseVector,
)

__all__ = [
    "Chunk",
    "EmbeddedChunk",
    "IndexResult",
    "RawDocument",
    "RawHit",
    "SearchHit",
    "SearchQuery",
    "SparseVector",
]
