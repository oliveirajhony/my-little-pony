"""Adapter da porta DenseEmbedder usando bge-m3 (sentence-transformers).

`device` é configurável: "cuda" no container WSL (GPU), "cpu" no dev Windows.
"""

from __future__ import annotations

from sentence_transformers import SentenceTransformer

DENSE_MODEL = "BAAI/bge-m3"
DENSE_DIM = 1024


class BgeM3DenseEmbedder:
    def __init__(
        self,
        model: str = DENSE_MODEL,
        device: str = "cpu",
        batch_size: int = 32,
    ) -> None:
        self._model = SentenceTransformer(model, device=device)
        self._batch_size = batch_size

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        vectors = self._model.encode(
            texts,
            batch_size=self._batch_size,
            normalize_embeddings=True,
        )
        return [vector.tolist() for vector in vectors]

    def embed_query(self, text: str) -> list[float]:
        return self._model.encode(text, normalize_embeddings=True).tolist()
