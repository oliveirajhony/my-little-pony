"""Testes do streaming de AnswerQuestion (sources antes de tokens)."""

from __future__ import annotations

from rag_service.adapters.fakes.fakes import FakeAnswerGenerator
from rag_service.application.use_cases.answer_question import AnswerQuestion, NO_ANSWER
from rag_service.domain.models import (
    AnswerSourcesEvent,
    AnswerTokenEvent,
    RawHit,
    SearchQuery,
)


def _uc(monkeypatch, ranked, generator=None, min_score=0.05):
    import rag_service.application.use_cases.answer_question as mod

    uc = AnswerQuestion(
        dense=None, sparse=None, index=None, reranker=None,
        generator=generator or FakeAnswerGenerator(), min_score=min_score,
    )
    # monkeypatch (não atribuição direta) restaura o módulo real ao fim do teste,
    # evitando vazar o fake `retrieve_and_rerank` para outros arquivos de teste
    # quando rodados no mesmo processo pytest.
    monkeypatch.setattr(mod, "retrieve_and_rerank", lambda *a, **k: ranked)
    return uc


def test_stream_emits_sources_then_tokens(monkeypatch):
    ranked = [RawHit(document_id="d1", chunk_id="c1", score=0.9, text="Etiópia", kind="native")]
    events = list(_uc(monkeypatch, ranked).stream(SearchQuery(query="café?", owner_id="o1", filters={})))

    assert isinstance(events[0], AnswerSourcesEvent)
    assert events[0].grounded is True
    assert events[0].sources[0].document_id == "d1"
    assert all(isinstance(e, AnswerTokenEvent) for e in events[1:])
    assert "".join(e.text for e in events[1:]) == "resposta baseada em 1 trecho(s)"


def test_stream_without_candidates_emits_no_answer_without_calling_llm(monkeypatch):
    gen = FakeAnswerGenerator()
    events = list(_uc(monkeypatch, [], generator=gen).stream(SearchQuery(query="x", owner_id="o1", filters={})))

    assert isinstance(events[0], AnswerSourcesEvent)
    assert events[0].grounded is False and events[0].sources == []
    assert events[1] == AnswerTokenEvent(NO_ANSWER)
    assert gen.calls == []
