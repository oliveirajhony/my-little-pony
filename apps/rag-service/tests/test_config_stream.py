import pytest
from pydantic import ValidationError

from rag_service.config import Settings


def test_stream_defaults():
    s = Settings()
    assert s.llm_max_concurrency == 1
    assert s.stream_queue_max_depth == 8
    assert s.stream_queue_max_wait_s == 30.0
    assert s.stream_idle_timeout_s == 60.0


def test_env_override(monkeypatch):
    monkeypatch.setenv("RAG_LLM_MAX_CONCURRENCY", "2")
    assert Settings().llm_max_concurrency == 2


def test_rejects_unknown_llm_backend(monkeypatch):
    monkeypatch.setenv("RAG_LLM_BACKEND", "gpt")  # typo/desconhecido
    with pytest.raises(ValidationError):
        Settings()


def test_openai_backend_requires_api_base(monkeypatch):
    monkeypatch.setenv("RAG_LLM_BACKEND", "openai")  # sem RAG_LLM_API_BASE
    with pytest.raises(ValidationError):
        Settings()


def test_openai_backend_with_base_is_valid(monkeypatch):
    monkeypatch.setenv("RAG_LLM_BACKEND", "openai")
    monkeypatch.setenv("RAG_LLM_API_BASE", "https://api.openai.com/v1")
    assert Settings().llm_backend == "openai"
