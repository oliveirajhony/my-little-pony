"""Testes do OpenAiAnswerGenerator com transporte HTTP mockado (sem API real).

Prova que o backend de geração hospedado/compatível funciona pela mesma porta
AnswerGenerator: monta o payload /chat/completions, envia o Bearer quando há
chave (e omite quando não há) e extrai o conteúdo da resposta.
"""

import json

import httpx

from rag_service.adapters.outbound.openai_answer_generator import OpenAiAnswerGenerator


def build(handler, api_key: str = "") -> OpenAiAnswerGenerator:
    http_client = httpx.Client(transport=httpx.MockTransport(handler))
    return OpenAiAnswerGenerator(
        base_url="https://api.example.com/v1",
        model="gpt-x",
        api_key=api_key,
        client=http_client,
    )


def test_posts_chat_completion_and_parses_content():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        seen["auth"] = request.headers.get("authorization")
        seen["body"] = json.loads(request.read())
        return httpx.Response(200, json={"choices": [{"message": {"content": "  resposta [1]  "}}]})

    generator = build(handler, api_key="sk-test")
    answer = generator.generate("origem do café?", "[1] o café vem da Etiópia")

    assert answer == "resposta [1]"  # trim aplicado
    assert seen["path"] == "/v1/chat/completions"
    assert seen["auth"] == "Bearer sk-test"
    assert seen["body"]["model"] == "gpt-x"
    assert seen["body"]["stream"] is False
    assert seen["body"]["messages"][0]["role"] == "system"
    assert "Etiópia" in seen["body"]["messages"][1]["content"]


def test_omits_authorization_header_when_no_key():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers.get("authorization")
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})

    generator = build(handler)  # sem chave (ex.: vLLM/LM Studio local)
    answer = generator.generate("q", "[1] c")

    assert answer == "ok"
    assert seen["auth"] is None


SSE = (
    b'data: {"choices":[{"delta":{"content":"Res"}}]}\n\n'
    b'data: {"choices":[{"delta":{"content":"posta"}}]}\n\n'
    b"data: [DONE]\n\n"
)


def test_stream_parses_sse_deltas():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = json.loads(request.read())
        return httpx.Response(200, content=SSE)

    tokens = list(build(handler, api_key="sk").generate_stream("q", "[1] ctx"))

    assert tokens == ["Res", "posta"]
    assert seen["body"]["stream"] is True
