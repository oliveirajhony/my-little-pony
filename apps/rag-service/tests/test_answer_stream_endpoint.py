import json

import pytest
from fastapi.testclient import TestClient

from rag_service.adapters.inbound import search_api
from rag_service.domain.models import AnswerSourcesEvent, AnswerTokenEvent


class _FakeUseCase:
    def stream(self, query):
        yield AnswerSourcesEvent(sources=[], grounded=True)
        yield AnswerTokenEvent("oi")
        yield AnswerTokenEvent(" mundo")


@pytest.fixture
def client():
    # Salva/restaura só o override deste teste: outros módulos (test_search_api)
    # registram o seu próprio no import — limpar tudo os quebraria.
    key = search_api.get_answer_use_case
    previous = search_api.app.dependency_overrides.get(key)
    search_api.app.dependency_overrides[key] = lambda: _FakeUseCase()
    yield TestClient(search_api.app)
    if previous is None:
        search_api.app.dependency_overrides.pop(key, None)
    else:
        search_api.app.dependency_overrides[key] = previous


def test_answer_stream_emits_status_sources_tokens_done(client):
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


def test_answer_stream_requires_service_token(client):
    with client.stream("POST", "/answer/stream", json={"query": "q", "ownerId": "o1"}) as resp:
        assert resp.status_code == 401
