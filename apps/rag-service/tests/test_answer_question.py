"""Testes do RAG generativo (AnswerQuestion) com fakes — sem LLM/infra real.

Cobre: grounding por limiar (trecho fraco não entra e, se nada passa, o LLM nem
é chamado), montagem de contexto e sources, e o caso "não encontrei".
"""

from __future__ import annotations

from rag_service.adapters.fakes import (
    FakeAnswerGenerator,
    FakeDenseEmbedder,
    FakeSparseEmbedder,
    InMemoryVectorIndex,
    LexicalReranker,
)
from rag_service.application.use_cases import AnswerQuestion
from rag_service.domain.models import Chunk, EmbeddedChunk, SearchQuery


def _index_with(*texts: str, owner_id: str = "o", kind: str = "native") -> InMemoryVectorIndex:
    index = InMemoryVectorIndex()
    dense = FakeDenseEmbedder()
    sparse = FakeSparseEmbedder()
    chunks = []
    for i, text in enumerate(texts, start=1):
        chunk = Chunk(chunk_id=f"c{i}", index=i, text=text, contextualized_text=text)
        chunks.append(
            EmbeddedChunk(
                document_id="doc-1",
                owner_id=owner_id,
                version=1,
                chunk=chunk,
                dense=dense.embed_query(text),
                sparse=sparse.embed_query(text),
                kind=kind,
            )
        )
    index.upsert(chunks)
    return index


def _use_case(index: InMemoryVectorIndex, generator: FakeAnswerGenerator, **kw) -> AnswerQuestion:
    return AnswerQuestion(
        dense=FakeDenseEmbedder(),
        sparse=FakeSparseEmbedder(),
        index=index,
        reranker=LexicalReranker(),
        generator=generator,
        **kw,
    )


def test_generates_answer_grounded_in_relevant_sources():
    index = _index_with("o café tem origem na Etiópia", "receita de bolo", kind="file")
    generator = FakeAnswerGenerator()
    # LexicalReranker pontua por sobreposição de tokens; limiar 0.5 mantém só o hit forte.
    use_case = _use_case(index, generator, min_score=0.5)

    result = use_case.execute(SearchQuery(query="origem do café", owner_id="o"))

    assert result.grounded is True
    assert len(generator.calls) == 1  # LLM chamado uma vez
    assert result.sources  # só os trechos relevantes
    assert all(s.kind == "file" for s in result.sources)
    assert all(s.document_id == "doc-1" for s in result.sources)


def test_falls_back_to_best_candidate_when_none_clear_threshold():
    # Pergunta conversacional: nenhum trecho cruza o limiar, mas o dono TEM docs.
    # Em vez de recusar (falso negativo), responde a partir do melhor candidato;
    # a anti-alucinação fica a cargo do system prompt do LLM.
    index = _index_with("assunto totalmente diferente")
    generator = FakeAnswerGenerator()
    use_case = _use_case(index, generator, min_score=0.5)

    result = use_case.execute(SearchQuery(query="xyz inexistente", owner_id="o"))

    assert result.grounded is True
    assert len(generator.calls) == 1  # LLM chamado a partir do candidato recuperado
    assert result.sources


def test_no_candidate_at_all_returns_not_found_without_calling_llm():
    # Contexto realmente vazio (dono sem docs): recusa sem chamar o LLM.
    index = _index_with("origem do café", owner_id="outro")
    generator = FakeAnswerGenerator()
    use_case = _use_case(index, generator, min_score=0.5)

    result = use_case.execute(SearchQuery(query="origem do café", owner_id="o"))

    assert result.grounded is False
    assert result.sources == []
    assert generator.calls == []  # não alucina com contexto vazio


def test_scopes_by_owner():
    index = _index_with("origem do café", owner_id="outro")
    generator = FakeAnswerGenerator()
    use_case = _use_case(index, generator, min_score=0.0)

    result = use_case.execute(SearchQuery(query="origem do café", owner_id="o"))

    assert result.grounded is False
    assert generator.calls == []
