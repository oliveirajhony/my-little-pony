"""Adapter da porta Reranker usando o cross-encoder bge-reranker-v2-m3."""

from __future__ import annotations

from sentence_transformers import CrossEncoder

from rag_service.domain.models import RawHit

RERANK_MODEL = "BAAI/bge-reranker-v2-m3"


class BgeReranker:
    def __init__(self, model: str = RERANK_MODEL, device: str = "cpu") -> None:
        # low_cpu_mem_usage=False avoids the "meta tensor" error when moving the
        # cross-encoder to GPU (accelerate loads on meta device by default).
        self._model = CrossEncoder(model, device=device, model_kwargs={"low_cpu_mem_usage": False})

    def rerank(self, query: str, hits: list[RawHit]) -> list[RawHit]:
        if not hits:
            return []

        pairs = [(query, hit.text) for hit in hits]
        scores = self._model.predict(pairs)

        ranked = sorted(zip(scores, hits, strict=False), key=lambda pair: pair[0], reverse=True)
        return [
            RawHit(
                document_id=hit.document_id,
                chunk_id=hit.chunk_id,
                score=float(score),
                text=hit.text,
                kind=hit.kind,
                headings=hit.headings,
            )
            for score, hit in ranked
        ]
