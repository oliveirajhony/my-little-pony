"""Testes de integração do RabbitMQ (precisa do broker do docker-compose em 5673)."""

import json
import time

import pika
import pytest

from rag_service.adapters.fakes import (
    FakeChunker,
    FakeDenseEmbedder,
    FakeDocumentSource,
    FakeSparseEmbedder,
    InMemoryVectorIndex,
)
from rag_service.adapters.inbound.rabbit_consumer import RabbitIndexConsumer
from rag_service.adapters.outbound.rabbit_publisher import RabbitEventPublisher
from rag_service.application.use_cases import IndexDocument
from rag_service.contracts import (
    EXCHANGE,
    QUEUE_INDEX_DLQ,
    QUEUE_INDEX_REQUESTED,
    ROUTING_INDEX_COMPLETED,
    ROUTING_INDEX_REQUESTED,
)
from rag_service.domain.models import IndexResult

pytestmark = pytest.mark.integration

RABBIT_URL = "amqp://rag:rag@localhost:5673/"


def _open():
    connection = pika.BlockingConnection(pika.URLParameters(RABBIT_URL))
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue=QUEUE_INDEX_REQUESTED, durable=True)
    channel.queue_bind(
        queue=QUEUE_INDEX_REQUESTED, exchange=EXCHANGE, routing_key=ROUTING_INDEX_REQUESTED
    )
    return connection, channel


def _publish(channel, body: bytes) -> None:
    channel.basic_publish(exchange=EXCHANGE, routing_key=ROUTING_INDEX_REQUESTED, body=body)


def _build_consumer(content: dict[str, str]):
    index = InMemoryVectorIndex()
    use_case = IndexDocument(
        source=FakeDocumentSource(content),
        chunker=FakeChunker(),
        dense=FakeDenseEmbedder(),
        sparse=FakeSparseEmbedder(),
        index=index,
    )
    consumer = RabbitIndexConsumer(
        RABBIT_URL, use_case, RabbitEventPublisher(RABBIT_URL), max_retries=2
    )
    return consumer, index


def test_publisher_emits_completed_event():
    connection, channel = _open()
    result_queue = channel.queue_declare(queue="", exclusive=True).method.queue
    channel.queue_bind(queue=result_queue, exchange=EXCHANGE, routing_key=ROUTING_INDEX_COMPLETED)

    RabbitEventPublisher(RABBIT_URL).publish_completed(
        IndexResult.ready("doc-1", chunk_count=3), correlation_id="corr-1"
    )

    body = None
    for _ in range(40):
        method, _props, body = channel.basic_get(queue=result_queue, auto_ack=True)
        if method is not None:
            break
        time.sleep(0.05)
    connection.close()

    assert body is not None
    payload = json.loads(body)
    assert payload["documentId"] == "doc-1"
    assert payload["status"] == "ready"
    assert payload["correlationId"] == "corr-1"


def test_consumer_success_publishes_completed_and_indexes():
    consumer, index = _build_consumer({"doc-42": "<h1>Café</h1><p>origem etiópia</p>"})

    connection, channel = _open()
    completed_queue = channel.queue_declare(queue="", exclusive=True).method.queue
    channel.queue_bind(
        queue=completed_queue, exchange=EXCHANGE, routing_key=ROUTING_INDEX_COMPLETED
    )
    channel.queue_purge(QUEUE_INDEX_REQUESTED)
    _publish(channel, json.dumps({"documentId": "doc-42", "ownerId": "owner-9", "version": 1}).encode())

    processed = consumer.process_pending(max_messages=1)
    assert processed == 1

    body = None
    for _ in range(40):
        method, _props, body = channel.basic_get(queue=completed_queue, auto_ack=True)
        if method is not None:
            break
        time.sleep(0.05)
    connection.close()

    assert body is not None
    completed = json.loads(body)
    assert completed["documentId"] == "doc-42"
    assert completed["status"] == "ready"
    assert index.all()
    assert all(c.owner_id == "owner-9" for c in index.all())


def test_consumer_sends_malformed_message_to_dlq():
    consumer, _index = _build_consumer({})

    connection, channel = _open()
    channel.queue_declare(queue=QUEUE_INDEX_DLQ, durable=True)
    channel.queue_purge(QUEUE_INDEX_DLQ)
    channel.queue_purge(QUEUE_INDEX_REQUESTED)
    _publish(channel, b"{ this is not valid json")

    processed = consumer.process_pending(max_messages=1)
    assert processed == 1

    body = None
    for _ in range(40):
        method, props, body = channel.basic_get(queue=QUEUE_INDEX_DLQ, auto_ack=True)
        if method is not None:
            break
        time.sleep(0.05)
    connection.close()

    assert body is not None  # a mensagem malformada foi preservada na DLQ, não perdida
