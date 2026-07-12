"""Generator por requisição: o provedor do usuário escolhe o backend do LLM.

`answer_generator_for(llm)` monta um generator novo a partir da config vinda na
requisição (backend/baseUrl/model/apiKey) sem tocar nos singletons pesados
(dense/sparse/index/reranker). `llm=None` cai no generator do env.
"""

from types import SimpleNamespace

from rag_service.adapters.outbound.ollama_answer_generator import OllamaAnswerGenerator
from rag_service.adapters.outbound.openai_answer_generator import OpenAiAnswerGenerator
from rag_service.composition import Composition
from rag_service.config import Settings


def make_composition(monkeypatch) -> Composition:
    monkeypatch.setenv("RAG_NEST_BASE_URL", "http://nest:3000")
    monkeypatch.setenv("RAG_NEST_SERVICE_TOKEN", "secret")
    monkeypatch.setenv("RAG_SERVICE_API_TOKEN", "search-secret")
    return Composition(Settings(_env_file=None))


def test_openai_backend_uses_request_config(monkeypatch):
    comp = make_composition(monkeypatch)
    llm = SimpleNamespace(
        backend="openai", baseUrl="https://openrouter.ai/api/v1", apiKey="sk-x", model="anthropic/claude"
    )

    gen = comp.answer_generator_for(llm)

    assert isinstance(gen, OpenAiAnswerGenerator)
    assert gen._url == "https://openrouter.ai/api/v1/chat/completions"
    assert gen._model == "anthropic/claude"


def test_ollama_backend_appends_chat_path(monkeypatch):
    comp = make_composition(monkeypatch)
    llm = SimpleNamespace(backend="ollama", baseUrl="http://host.docker.internal:11434", apiKey=None, model="llama3")

    gen = comp.answer_generator_for(llm)

    assert isinstance(gen, OllamaAnswerGenerator)
    assert gen._url == "http://host.docker.internal:11434/api/chat"
    assert gen._model == "llama3"


def test_none_falls_back_to_env_generator(monkeypatch):
    monkeypatch.setenv("RAG_LLM_BACKEND", "openai")
    monkeypatch.setenv("RAG_LLM_MODEL", "env-model")
    # backend openai exige a base no env (validação do Settings).
    monkeypatch.setenv("RAG_LLM_API_BASE", "https://api.example.com/v1")
    comp = make_composition(monkeypatch)

    gen = comp.answer_generator_for(None)

    assert isinstance(gen, OpenAiAnswerGenerator)
    assert gen._model == "env-model"
    # É o mesmo singleton que answer_generator() (env), não um objeto novo.
    assert gen is comp.answer_generator()
