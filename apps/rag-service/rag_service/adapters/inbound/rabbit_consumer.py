"""Consumer RabbitMQ que orquestra a indexação de documentos.

Responsabilidades (pós-auditoria):
  - traduzir document.index.requested no caso de uso IndexDocument;
  - reportar document.index.completed (ready/failed);
  - RETRY com backoff (fila de retry com TTL que devolve à principal);
  - DLQ (parking) para mensagens malformadas ou que esgotaram o retry —
    nunca ack-silencioso;
  - correlation-id ponta a ponta.

`prefetch=1` + heartbeat alto (o embedding é longo e bloqueia a thread).

A DECISÃO (o que fazer com a mensagem) fica em `_decide`, testável com fakes;
a mecânica pika (publish/ack) fica em `_apply`/`_handle`.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from uuid import uuid4

import pika

from rag_service.application.use_cases import DeindexDocument, IndexDocument
from rag_service.contracts import (
    EXCHANGE,
    HEADER_RETRY_COUNT,
    QUEUE_DEINDEX_REQUESTED,
    QUEUE_INDEX_DLQ,
    QUEUE_INDEX_REQUESTED,
    QUEUE_INDEX_RETRY,
    ROUTING_DEINDEX_REQUESTED,
    ROUTING_INDEX_REQUESTED,
)
from rag_service.domain.models import IndexResult
from rag_service.observability import (
    CHUNKS_EMBEDDED,
    DOCS_INDEXED,
    DOCS_PARKED,
    DOCS_RETRIED,
)

logger = logging.getLogger(__name__)


@dataclass
class _Action:
    """O que fazer com a mensagem, decidido sem tocar no pika."""

    kind: str  # "completed" | "skip" | "retry" | "park"
    correlation_id: str | None = None
    result: IndexResult | None = None  # completed a publicar (ready/failed)
    body: bytes | None = None  # corpo a re-publicar (retry/park)
    retry_count: int = 0  # nova contagem (retry)
    reason: str | None = None  # motivo do park


class RabbitIndexConsumer:
    def __init__(
        self,
        url: str,
        index_document: IndexDocument,
        publisher,
        deindex_document: DeindexDocument | None = None,
        max_retries: int = 3,
        retry_ttl_ms: int = 10_000,
        heartbeat: int = 600,
        exchange: str = EXCHANGE,
        queue: str = QUEUE_INDEX_REQUESTED,
    ) -> None:
        self._params = pika.URLParameters(url)
        self._params.heartbeat = heartbeat
        self._use_case = index_document
        self._deindex = deindex_document
        self._publisher = publisher
        self._max_retries = max_retries
        self._retry_ttl_ms = retry_ttl_ms
        self._exchange = exchange
        self._queue = queue

    # ------------------------------------------------------------------ #
    # Decisão (testável com fakes, sem RabbitMQ)
    # ------------------------------------------------------------------ #
    def _decide(self, body: bytes, retry_count: int) -> _Action:
        try:
            data = json.loads(body)
            document_id = data["documentId"]
            owner_id = data["ownerId"]
            version = int(data.get("version", 0))
            source_kind = data.get("kind", "native")
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
            # Não dá para reportar completed (sem documentId confiável) → DLQ.
            return _Action(kind="park", body=body, reason=f"malformed: {error}")

        correlation_id = data.get("correlationId") or str(uuid4())

        try:
            result = self._use_case.execute(document_id, owner_id, version, source_kind)
        except Exception as error:  # noqa: BLE001 - decidimos retry/DLQ, não engolimos
            if retry_count < self._max_retries:
                data["correlationId"] = correlation_id
                return _Action(
                    kind="retry",
                    body=json.dumps(data).encode("utf-8"),
                    retry_count=retry_count + 1,
                    correlation_id=correlation_id,
                )
            # Esgotou o retry: reporta failed (destrava o Nest) + parka.
            return _Action(
                kind="park",
                body=body,
                reason=str(error),
                result=IndexResult.failed(document_id, str(error), kind=source_kind),
                correlation_id=correlation_id,
            )

        return _Action(kind="completed", result=result, correlation_id=correlation_id)

    # ------------------------------------------------------------------ #
    # Mecânica pika
    # ------------------------------------------------------------------ #
    def _apply(self, channel, action: _Action) -> None:
        if action.kind == "completed":
            assert action.result is not None  # garantido pela decisão
            self._publisher.publish_completed(action.result, action.correlation_id)
            DOCS_INDEXED.inc()
            CHUNKS_EMBEDDED.inc(action.result.embedded_count)
            logger.info(
                "◀ completed %s status=%s chunks=%s embedados=%s [%s]",
                action.result.document_id,
                action.result.status,
                action.result.chunk_count,
                action.result.embedded_count,
                action.correlation_id,
            )

        elif action.kind == "retry":
            channel.basic_publish(
                exchange="",
                routing_key=QUEUE_INDEX_RETRY,
                body=action.body,
                properties=pika.BasicProperties(
                    delivery_mode=2,
                    headers={HEADER_RETRY_COUNT: action.retry_count},
                    correlation_id=action.correlation_id,
                ),
            )
            DOCS_RETRIED.inc()
            logger.warning(
                "⟳ retry %d/%d agendado (%dms) [%s]",
                action.retry_count,
                self._max_retries,
                self._retry_ttl_ms,
                action.correlation_id,
            )

        elif action.kind == "park":
            reason = "exhausted" if action.result is not None else "malformed"
            DOCS_PARKED.labels(reason=reason).inc()
            if action.result is not None:
                self._publisher.publish_completed(action.result, action.correlation_id)
            channel.basic_publish(
                exchange="",
                routing_key=QUEUE_INDEX_DLQ,
                body=action.body,
                properties=pika.BasicProperties(
                    delivery_mode=2,
                    headers={"x-park-reason": action.reason},
                    correlation_id=action.correlation_id,
                ),
            )
            logger.error("✖ mensagem parkada na DLQ: %s [%s]", action.reason, action.correlation_id)

    def _handle(self, channel, method, properties, body: bytes) -> None:
        retry_count = 0
        if properties and properties.headers:
            retry_count = int(properties.headers.get(HEADER_RETRY_COUNT, 0))

        action = self._decide(body, retry_count)
        self._apply(channel, action)
        channel.basic_ack(delivery_tag=method.delivery_tag)

    def _handle_deindex(self, channel, method, _properties, body: bytes) -> None:
        """De-indexa uma fonte removida. Sempre ACK: falha aqui só deixa
        vetores órfãos, filtrados no enrichment do Nest (fonte já não existe)."""
        try:
            document_id = json.loads(body)["documentId"]
            if self._deindex is not None:
                self._deindex.execute(document_id)
        except (json.JSONDecodeError, KeyError, TypeError) as error:
            logger.error("✖ deindex malformado, ignorando: %s", error)
        except Exception as error:  # noqa: BLE001 - órfãos são inofensivos; não trava a fila
            logger.warning("⚠ falha ao de-indexar (vetores órfãos): %s", error)
        channel.basic_ack(delivery_tag=method.delivery_tag)

    # ------------------------------------------------------------------ #
    # Topologia + loops
    # ------------------------------------------------------------------ #
    def _setup(self, channel) -> None:
        channel.exchange_declare(exchange=self._exchange, exchange_type="topic", durable=True)
        channel.queue_declare(queue=self._queue, durable=True)
        channel.queue_bind(
            queue=self._queue, exchange=self._exchange, routing_key=ROUTING_INDEX_REQUESTED
        )
        # Fila de retry: segura a mensagem RETRY_TTL_MS e devolve à principal.
        channel.queue_declare(
            queue=QUEUE_INDEX_RETRY,
            durable=True,
            arguments={
                "x-message-ttl": self._retry_ttl_ms,
                "x-dead-letter-exchange": self._exchange,
                "x-dead-letter-routing-key": ROUTING_INDEX_REQUESTED,
            },
        )
        # DLQ: parking lot (não é consumida automaticamente).
        channel.queue_declare(queue=QUEUE_INDEX_DLQ, durable=True)
        # Fila de de-indexação (fonte removida): descarta os vetores.
        if self._deindex is not None:
            channel.queue_declare(queue=QUEUE_DEINDEX_REQUESTED, durable=True)
            channel.queue_bind(
                queue=QUEUE_DEINDEX_REQUESTED,
                exchange=self._exchange,
                routing_key=ROUTING_DEINDEX_REQUESTED,
            )
        channel.basic_qos(prefetch_count=1)

    def start(self) -> None:
        """Loop bloqueante de consumo (produção)."""
        connection = pika.BlockingConnection(self._params)
        channel = connection.channel()
        self._setup(channel)
        logger.info("Worker consumindo a fila '%s'...", self._queue)
        channel.basic_consume(queue=self._queue, on_message_callback=self._handle)
        if self._deindex is not None:
            channel.basic_consume(
                queue=QUEUE_DEINDEX_REQUESTED, on_message_callback=self._handle_deindex
            )
        channel.start_consuming()

    def process_pending(self, max_messages: int = 100, timeout: float = 2.0) -> int:
        """Processa as mensagens já enfileiradas e para (testes)."""
        connection = pika.BlockingConnection(self._params)
        channel = connection.channel()
        self._setup(channel)

        processed = 0
        for method, properties, body in channel.consume(self._queue, inactivity_timeout=timeout):
            if method is None:
                break
            self._handle(channel, method, properties, body)
            processed += 1
            if processed >= max_messages:
                break

        channel.cancel()
        connection.close()
        return processed
