"""Adapter da porta SparseEmbedder usando BM25 (fastembed).

Usa `embed` para documentos e `query_embed` para a consulta (BM25 trata os dois
de forma diferente). O IDF é calculado pelo Qdrant no servidor.
"""

from __future__ import annotations

from fastembed import SparseTextEmbedding

from rag_service.domain.models import SparseVector

SPARSE_MODEL = "Qdrant/bm25"


class Bm25SparseEmbedder:
    def __init__(self, model: str = SPARSE_MODEL) -> None:
        self._model = SparseTextEmbedding(model_name=model)

    def embed_documents(self, texts: list[str]) -> list[SparseVector]:
        return [
            SparseVector(indices=embedding.indices.tolist(), values=embedding.values.tolist())
            for embedding in self._model.embed(texts)
        ]

    def embed_query(self, text: str) -> SparseVector:
        embedding = next(iter(self._model.query_embed(text)))
        return SparseVector(indices=embedding.indices.tolist(), values=embedding.values.tolist())
