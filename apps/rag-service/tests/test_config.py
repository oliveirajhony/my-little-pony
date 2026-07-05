"""Testes da configuração: secret obrigatório falha o boot."""

import pytest
from pydantic import ValidationError

from rag_service.config import Settings


def test_boot_fails_without_service_token(monkeypatch):
    # Sem os secrets obrigatórios (e sem .env), a validação deve falhar.
    monkeypatch.delenv("RAG_NEST_SERVICE_TOKEN", raising=False)
    monkeypatch.delenv("RAG_NEST_BASE_URL", raising=False)
    monkeypatch.delenv("RAG_SERVICE_API_TOKEN", raising=False)

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_loads_with_required_secrets(monkeypatch):
    monkeypatch.setenv("RAG_NEST_BASE_URL", "http://nest:3000")
    monkeypatch.setenv("RAG_NEST_SERVICE_TOKEN", "secret")
    monkeypatch.setenv("RAG_SERVICE_API_TOKEN", "search-secret")

    settings = Settings(_env_file=None)

    assert settings.nest_base_url == "http://nest:3000"
    assert settings.nest_service_token == "secret"
    assert settings.service_api_token == "search-secret"
    # Defaults de infra continuam disponíveis.
    assert settings.qdrant_url.startswith("http")
    assert settings.device == "cpu"
    assert settings.max_retries >= 1
