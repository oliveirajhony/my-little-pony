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
