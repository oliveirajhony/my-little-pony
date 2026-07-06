"""Recuperação híbrida + rerank, compartilhada pela busca e pelo RAG.

Estágio 1 (recall): embeda a query (denso+esparso) e busca candidatos no índice
filtrando por dono. Estágio 2 (precisão): o cross-encoder reordena. Retorna os
RawHit rerankeados (texto + score preservados) para a busca recortar snippet e
o RAG montar contexto/filtrar por limiar.
"""

from __future__ import annotations

from rag_service.application.ports import DenseEmbedder, Reranker, SparseEmbedder, VectorIndex
from rag_service.domain.models import RawHit, SearchQuery

# Quantos candidatos o índice traz antes do rerank (recall alto).
RERANK_CANDIDATES = 30


def retrieve_and_rerank(
    query: SearchQuery,
    dense: DenseEmbedder,
    sparse: SparseEmbedder,
    index: VectorIndex,
    reranker: Reranker,
    candidates: int = RERANK_CANDIDATES,
) -> list[RawHit]:
    if not query.query.strip():
        return []

    hits = index.search(
        dense=dense.embed_query(query.query),
        sparse=sparse.embed_query(query.query),
        owner_id=query.owner_id,
        filters=query.filters,
        limit=candidates,
    )
    if not hits:
        return []

    return reranker.rerank(query.query, hits)
