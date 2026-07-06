"""Caso de uso: busca híbrida + rerank, escopada ao dono.

Fluxo (exposto via POST /search):
  embedar a query (denso+esparso) -> buscar no índice filtrando por owner_id
  -> rerank -> top_k -> montar snippets.
"""

from __future__ import annotations

from rag_service.application.ports import (
    DenseEmbedder,
    Reranker,
    SparseEmbedder,
    VectorIndex,
)
from rag_service.application.retrieval import retrieve_and_rerank
from rag_service.domain.models import SearchHit, SearchQuery

SNIPPET_MAX = 280


class SearchDocuments:
    def __init__(
        self,
        dense: DenseEmbedder,
        sparse: SparseEmbedder,
        index: VectorIndex,
        reranker: Reranker,
    ) -> None:
        self._dense = dense
        self._sparse = sparse
        self._index = index
        self._reranker = reranker

    def execute(self, query: SearchQuery) -> list[SearchHit]:
        ranked = retrieve_and_rerank(query, self._dense, self._sparse, self._index, self._reranker)
        return [
            SearchHit(
                document_id=hit.document_id,
                chunk_id=hit.chunk_id,
                score=hit.score,
                snippet=_snippet(hit.text),
                kind=hit.kind,
            )
            for hit in ranked[: query.top_k]
        ]


def _snippet(text: str) -> str:
    clean = " ".join((text or "").split())
    if len(clean) <= SNIPPET_MAX:
        return clean
    return clean[:SNIPPET_MAX].rstrip() + "…"
