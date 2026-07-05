"""Testes do NestContentClient com transporte HTTP mockado (sem Nest real)."""

import httpx
import pytest

from rag_service.adapters.outbound.nest_content_client import NestContentClient


def build_client(handler) -> NestContentClient:
    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(transport=transport)
    return NestContentClient("http://nest:3000", "service-secret", client=http_client)


def test_fetches_descriptor_and_sends_service_auth():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers.get("Authorization")
        seen["path"] = request.url.path
        return httpx.Response(200, json={"kind": "native", "content": "<h1>Café</h1>"})

    client = build_client(handler)
    descriptor = client.fetch_descriptor("doc-1")

    assert descriptor == {"kind": "native", "content": "<h1>Café</h1>"}
    assert seen["auth"] == "Bearer service-secret"
    assert seen["path"] == "/internal/documents/doc-1/content"


def test_raises_on_not_found():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"message": "not found"})

    client = build_client(handler)

    with pytest.raises(httpx.HTTPStatusError):
        client.fetch_descriptor("missing")
