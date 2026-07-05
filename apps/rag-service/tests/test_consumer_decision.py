"""Testes da lógica de decisão do consumer (sem RabbitMQ, com fakes).

Cobre os cenários da auditoria: malformado→DLQ, sucesso→completed, stale→skip,
falha com retry disponível→retry, falha esgotada→DLQ + completed(failed).
"""

import json

from rag_service.adapters.fakes import (
    FakeChunker,
    FakeDenseEmbedder,
    FakeDocumentSource,
    FakeSparseEmbedder,
    InMemoryVectorIndex,
    RecordingPublisher,
)
from rag_service.adapters.inbound.rabbit_consumer import RabbitIndexConsumer
from rag_service.application.use_cases import IndexDocument

HTML = "<h1>Café</h1><p>a lenda de Kaldi</p>"


def build(content: dict[str, str], max_retries: int = 2):
    index = InMemoryVectorIndex()
    use_case = IndexDocument(
        source=FakeDocumentSource(content),
        chunker=FakeChunker(),
        dense=FakeDenseEmbedder(),
        sparse=FakeSparseEmbedder(),
        index=index,
    )
    consumer = RabbitIndexConsumer(
        url="amqp://x", index_document=use_case, publisher=RecordingPublisher(), max_retries=max_retries
    )
    return consumer, index


def msg(**kwargs) -> bytes:
    return json.dumps(kwargs).encode("utf-8")


def test_success_decides_completed():
    consumer, _ = build({"doc-1": HTML})

    action = consumer._decide(msg(documentId="doc-1", ownerId="o", version=1), retry_count=0)

    assert action.kind == "completed"
    assert action.result.status == "ready"
    assert action.correlation_id


def test_malformed_body_decides_park():
    consumer, _ = build({})

    action = consumer._decide(b"{ not json", retry_count=0)

    assert action.kind == "park"
    assert action.reason.startswith("malformed")
    assert action.result is None  # não dá para reportar completed


def test_missing_required_field_decides_park():
    consumer, _ = build({})

    action = consumer._decide(msg(ownerId="o", version=1), retry_count=0)  # sem documentId

    assert action.kind == "park"
    assert action.reason.startswith("malformed")


def test_failure_with_retries_left_decides_retry():
    consumer, _ = build({})  # doc-1 não existe -> execute levanta

    action = consumer._decide(msg(documentId="doc-1", ownerId="o", version=1), retry_count=0)

    assert action.kind == "retry"
    assert action.retry_count == 1
    # correlationId é preservado no corpo re-publicado
    assert json.loads(action.body)["correlationId"] == action.correlation_id


def test_failure_exhausted_decides_park_with_failed():
    consumer, _ = build({}, max_retries=2)

    action = consumer._decide(msg(documentId="doc-1", ownerId="o", version=1), retry_count=2)

    assert action.kind == "park"
    assert action.result is not None
    assert action.result.status == "failed"
    assert action.result.error


def test_stale_event_decides_completed_ready():
    consumer, index = build({"doc-1": HTML})

    # Indexa versão 5, depois chega evento versão 3 (antigo).
    consumer._decide(msg(documentId="doc-1", ownerId="o", version=5), retry_count=0)
    action = consumer._decide(msg(documentId="doc-1", ownerId="o", version=3), retry_count=0)

    # Confirma ready (idempotente) em vez de skipar — não deixa o Nest pendurado.
    assert action.kind == "completed"
    assert action.result.status == "ready"
    assert action.result.embedded_count == 0
    assert all(c.version == 5 for c in index.all())  # não regrediu
