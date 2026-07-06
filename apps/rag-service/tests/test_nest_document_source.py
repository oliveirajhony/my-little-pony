"""Testes do NestDocumentSource: resolve HTML nativo OU arquivo do storage."""

import httpx

from rag_service.adapters.fakes import FakeBlobStorage
from rag_service.adapters.outbound.nest_content_client import NestContentClient
from rag_service.adapters.outbound.nest_document_source import NestDocumentSource


def source_for(descriptor: dict, blobs: FakeBlobStorage | None = None) -> NestDocumentSource:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=descriptor)

    nest = NestContentClient(
        "http://nest:3000", "x", client=httpx.Client(transport=httpx.MockTransport(handler))
    )
    return NestDocumentSource(nest, blobs or FakeBlobStorage())


def test_native_document_becomes_html_bytes():
    source = source_for({"kind": "native", "content": "<h1>Café</h1>"})

    raw = source.fetch("doc-1")

    assert raw.filename == "document.html"
    assert raw.data == "<h1>Café</h1>".encode()


def test_file_document_is_read_from_blob_storage():
    blobs = FakeBlobStorage({"docs/relatorio.pdf": b"%PDF-1.7 fake bytes"})
    source = source_for(
        {"kind": "file", "storageKey": "docs/relatorio.pdf", "filename": "relatorio.pdf"},
        blobs,
    )

    raw = source.fetch("doc-1")

    assert raw.filename == "relatorio.pdf"
    assert raw.data == b"%PDF-1.7 fake bytes"


def test_filename_falls_back_to_storage_key_basename():
    blobs = FakeBlobStorage({"docs/abc123.docx": b"docx bytes"})
    source = source_for({"kind": "file", "storageKey": "docs/abc123.docx"}, blobs)

    raw = source.fetch("doc-1")

    assert raw.filename == "abc123.docx"
