"""Caso de uso: RAG generativo (recupera + rerankeia + GERA resposta).

Diferença para o SearchDocuments (que só recupera): aqui os trechos relevantes
viram CONTEXTO para um LLM gerar a resposta, ancorada nas fontes, sem inventar.

Grounding (porta do v2/responder.py para o hexágono):
  - só entram no contexto trechos com score de rerank >= limiar;
  - se nenhum trecho for relevante, NÃO chama o LLM: devolve "não encontrei"
    (grounded=False) — evita alucinação por contexto vazio;
  - o contexto é truncado a um teto de chars (não estourar a janela);
  - a resposta cita as fontes com [n], numeradas na mesma ordem de `sources`.
"""

from __future__ import annotations

from rag_service.application.ports import (
    AnswerGenerator,
    DenseEmbedder,
    Reranker,
    SparseEmbedder,
    VectorIndex,
)
from rag_service.application.retrieval import retrieve_and_rerank
from rag_service.domain.models import Answer, AnswerSource, RawHit, SearchQuery

NO_ANSWER = "Não encontrei essa informação nos documentos."
SNIPPET_MAX = 280


class AnswerQuestion:
    def __init__(
        self,
        dense: DenseEmbedder,
        sparse: SparseEmbedder,
        index: VectorIndex,
        reranker: Reranker,
        generator: AnswerGenerator,
        min_score: float = 0.05,
        top_k: int = 5,
        max_context_chars: int = 8000,
    ) -> None:
        self._dense = dense
        self._sparse = sparse
        self._index = index
        self._reranker = reranker
        self._generator = generator
        self._min_score = min_score
        self._top_k = top_k
        self._max_context_chars = max_context_chars

    def execute(self, query: SearchQuery) -> Answer:
        ranked = retrieve_and_rerank(query, self._dense, self._sparse, self._index, self._reranker)
        relevant = [hit for hit in ranked if hit.score >= self._min_score][: self._top_k]

        if not relevant:
            return Answer(answer=NO_ANSWER, grounded=False, sources=[])

        context = _build_context(relevant, self._max_context_chars)
        answer = self._generator.generate(query.query, context)

        return Answer(
            answer=answer,
            grounded=True,
            sources=[
                AnswerSource(
                    document_id=hit.document_id,
                    chunk_id=hit.chunk_id,
                    score=hit.score,
                    snippet=_snippet(hit.text),
                    kind=hit.kind,
                )
                for hit in relevant
            ],
        )


def _build_context(hits: list[RawHit], max_chars: int) -> str:
    """Monta blocos numerados [n], respeitando o teto de chars (corta blocos
    inteiros para não deixar trecho pela metade)."""
    blocks: list[str] = []
    used = 0
    for number, hit in enumerate(hits, start=1):
        block = f"[{number}] {hit.text.strip()}"
        if used + len(block) > max_chars and blocks:
            break
        blocks.append(block)
        used += len(block)
    return "\n\n".join(blocks)


def _snippet(text: str) -> str:
    clean = " ".join((text or "").split())
    if len(clean) <= SNIPPET_MAX:
        return clean
    return clean[:SNIPPET_MAX].rstrip() + "…"
