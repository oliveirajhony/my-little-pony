import json

from fastapi.testclient import TestClient

from rag_service.adapters.inbound import search_api
from rag_service.domain.models import AnswerSourcesEvent, AnswerTokenEvent


class _FakeUseCase:
    def stream(self, query):
        yield AnswerSourcesEvent(sources=[], grounded=True)
        yield AnswerTokenEvent("oi")
        yield AnswerTokenEvent(" mundo")


def _client():
    search_api.app.dependency_overrides[search_api.get_answer_use_case] = lambda: _FakeUseCase()
    return TestClient(search_api.app)


def test_answer_stream_emits_status_sources_tokens_done():
    client = _client()
    token = f"Bearer {search_api.get_settings().service_api_token}"
    with client.stream(
        "POST", "/answer/stream",
        headers={"authorization": token},
        json={"query": "q", "ownerId": "o1"},
    ) as resp:
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        frames = [
            json.loads(line[len("data:"):])
            for line in resp.iter_lines()
            if line.startswith("data:")
        ]
    types = [f["type"] for f in frames]
    assert types[0] == "status"
    assert "sources" in types and "token" in types and types[-1] == "done"
    assert "".join(f["text"] for f in frames if f["type"] == "token") == "oi mundo"


def test_answer_stream_requires_service_token():
    client = _client()
    with client.stream("POST", "/answer/stream", json={"query": "q", "ownerId": "o1"}) as resp:
        assert resp.status_code == 401
