"""Publica document.index.completed no RabbitMQ (pika).

Usado pelo consumer para reportar a conclusão ao Nest. Mensagens persistentes
e com `correlation_id` (propriedade AMQP) para rastreabilidade ponta a ponta.
"""

from __future__ import annotations

import json

import pika

from rag_service.contracts import EXCHANGE, ROUTING_INDEX_COMPLETED
from rag_service.domain.models import IndexResult


class RabbitEventPublisher:
    def __init__(self, url: str, exchange: str = EXCHANGE, heartbeat: int = 600) -> None:
        self._params = pika.URLParameters(url)
        self._params.heartbeat = heartbeat
        self._exchange = exchange
        self._connect()

    def _connect(self) -> None:
        self._connection = pika.BlockingConnection(self._params)
        self._channel = self._connection.channel()
        self._channel.exchange_declare(
            exchange=self._exchange, exchange_type="topic", durable=True
        )

    def publish_completed(self, result: IndexResult, correlation_id: str | None = None) -> None:
        payload = {
            "documentId": result.document_id,
            "status": result.status,
            "chunkCount": result.chunk_count,
        }
        if result.error is not None:
            payload["error"] = result.error
        if correlation_id is not None:
            payload["correlationId"] = correlation_id

        if self._connection.is_closed:
            self._connect()

        self._channel.basic_publish(
            exchange=self._exchange,
            routing_key=ROUTING_INDEX_COMPLETED,
            body=json.dumps(payload).encode("utf-8"),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2,
                correlation_id=correlation_id,
            ),
        )

    def close(self) -> None:
        if self._connection and self._connection.is_open:
            self._connection.close()
