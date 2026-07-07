"""Caso de uso: RAG generativo (recupera + rerankeia + GERA resposta).

Diferença para o SearchDocuments (que só recupera): aqui os trechos relevantes
viram CONTEXTO para um LLM gerar a resposta, ancorada nas fontes, sem inventar.

Grounding:
  - preferimos trechos com score de rerank >= limiar (RAG_ANSWER_MIN_SCORE);
  - se NENHUM cruza o limiar mas ainda há candidatos recuperados, respondemos a
    partir dos melhores (o reranker já os ordenou). Motivo: o cross-encoder dá
    scores baixíssimos para perguntas conversacionais ("quem é a pessoa?") mesmo
    quando a resposta ESTÁ no corpus — recusar aí seria falso negativo;
  - só quando não há candidato ALGUM (dono sem docs indexados) é que NÃO
    chamamos o LLM e devolvemos "não encontrei" (grounded=False);
  - a anti-alucinação real é o system prompt: o LLM responde só pelo contexto ou
    recusa explicitamente. O limiar apenas prioriza os trechos de alta confiança;
  - o contexto é truncado a um teto de chars (não estourar a janela);
  - a resposta cita as fontes com [n], numeradas na mesma ordem de `sources`.
"""

from __future__ import annotations

from collections.abc import Iterator

from rag_service.application.ports import (
    AnswerGenerator,
    DenseEmbedder,
    Reranker,
    SparseEmbedder,
    VectorIndex,
)
from rag_service.application.retrieval import retrieve_and_rerank
from rag_service.application.snippet import snippet as _snippet
from rag_service.domain.models import (
    Answer,
    AnswerEvent,
    AnswerSource,
    AnswerSourcesEvent,
    AnswerTokenEvent,
    RawHit,
    SearchQuery,
)

NO_ANSWER = "Não encontrei essa informação nos documentos."


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

    def _retrieve(self, query: SearchQuery) -> list[RawHit]:
        """Recupera + rerankeia + seleciona os trechos de contexto. Compartilhado
        pelo caminho síncrono (execute) e pelo streaming (stream)."""
        return self._select(
            retrieve_and_rerank(query, self._dense, self._sparse, self._index, self._reranker)
        )

    def _select(self, ranked: list[RawHit]) -> list[RawHit]:
        # Fallback: nada cruzou o limiar, mas há candidatos → responde a partir
        # dos melhores em vez de recusar (o LLM ancora ou recusa pelo prompt).
        # Vazio SÓ quando `ranked` já é vazio (contexto realmente sem candidato).
        relevant = [hit for hit in ranked if hit.score >= self._min_score][: self._top_k]
        return relevant or ranked[: self._top_k]

    def _to_sources(self, hits: list[RawHit]) -> list[AnswerSource]:
        return [
            AnswerSource(
                document_id=hit.document_id,
                chunk_id=hit.chunk_id,
                score=hit.score,
                snippet=_snippet(hit.text),
                kind=hit.kind,
            )
            for hit in hits
        ]

    def execute(self, query: SearchQuery) -> Answer:
        relevant = self._retrieve(query)

        # Só recusa sem chamar o LLM quando NÃO há candidato algum (contexto vazio).
        if not relevant:
            return Answer(answer=NO_ANSWER, grounded=False, sources=[])

        context = _build_context(relevant, self._max_context_chars)
        answer = self._generator.generate(query.query, context)

        return Answer(answer=answer, grounded=True, sources=self._to_sources(relevant))

    def stream(self, query: SearchQuery) -> Iterator[AnswerEvent]:
        relevant = self._retrieve(query)

        if not relevant:
            yield AnswerSourcesEvent(sources=[], grounded=False)
            yield AnswerTokenEvent(NO_ANSWER)
            return

        yield AnswerSourcesEvent(sources=self._to_sources(relevant), grounded=True)
        context = _build_context(relevant, self._max_context_chars)
        for token in self._generator.generate_stream(query.query, context):
            yield AnswerTokenEvent(token)


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
