import httpx

from rag_service.adapters.outbound.ollama_answer_generator import OllamaAnswerGenerator


def build(handler) -> OllamaAnswerGenerator:
    return OllamaAnswerGenerator(
        url="http://ollama:11434/api/chat",
        model="qwen2.5:7b",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )


NDJSON = (
    b'{"message":{"content":"Res"},"done":false}\n'
    b'{"message":{"content":"posta"},"done":false}\n'
    b'{"message":{"content":""},"done":true}\n'
)


def test_stream_sends_stream_true_and_yields_content_chunks():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        import json

        seen["body"] = json.loads(request.read())
        return httpx.Response(200, content=NDJSON)

    tokens = list(build(handler).generate_stream("q", "[1] ctx"))

    assert tokens == ["Res", "posta"]
    assert seen["body"]["stream"] is True
    assert seen["body"]["messages"][0]["role"] == "system"


def test_generate_still_works_non_streaming():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"message": {"content": " ok "}})

    assert build(handler).generate("q", "[1] c") == "ok"
