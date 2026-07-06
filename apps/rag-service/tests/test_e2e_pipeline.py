"""Teste end-to-end do pipeline completo com INFRA REAL.

Real: Qdrant (:6333) + RabbitMQ (:5673) + modelos (bge-m3, BM25, reranker, Docling).
Fake: apenas o Nest — um mini servidor HTTP em thread servindo
      GET /internal/documents/{id}/content -> { "content": <html> }.

Fluxo exercitado:
  publish document.index.requested
    -> worker consome
    -> NestContentClient busca o HTML no Nest fake
    -> DoclingHtmlChunker + bge-m3 + BM25
    -> QdrantServerIndex (upsert, filtro por dono)
    -> publica document.index.completed
  -> SearchDocuments encontra o documento (escopado ao owner)
"""

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

import pika
import pytest
from qdrant_client import QdrantClient

from rag_service.composition import Composition
from rag_service.config import Settings
from rag_service.contracts import (
    EXCHANGE,
    QUEUE_INDEX_REQUESTED,
    ROUTING_INDEX_COMPLETED,
    ROUTING_INDEX_REQUESTED,
)
from rag_service.domain.models import SearchQuery

pytestmark = pytest.mark.integration

QDRANT_URL = "http://localhost:6333"
RABBIT_URL = "amqp://rag:rag@localhost:5673/"
COLLECTION = "e2e_documents"

DOC_HTML = (
    "<html><body>"
    "<h1>Café</h1>"
    "<p>A origem do café vem da Etiópia, contada pela lenda do pastor Kaldi, "
    "que percebeu suas cabras agitadas após comerem os frutos vermelhos.</p>"
    "</body></html>"
)


class _FakeNestHandler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 - assinatura do http.server
        if self.path.endswith("/content"):
            body = json.dumps({"content": DOC_HTML}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *_args):  # silencia o log do servidor
        pass


@pytest.fixture
def fake_nest():
    server = HTTPServer(("127.0.0.1", 0), _FakeNestHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{port}"
    server.shutdown()


@pytest.fixture
def composition(fake_nest):
    settings = Settings(
        _env_file=None,
        nest_base_url=fake_nest,
        nest_service_token="svc-token",
        service_api_token="search-token",
        qdrant_collection=COLLECTION,
    )

    client = QdrantClient(url=QDRANT_URL)
    if client.collection_exists(COLLECTION):
        client.delete_collection(COLLECTION)

    yield Composition(settings)

    client.delete_collection(COLLECTION)


def _publish_requested(document_id: str, owner_id: str, version: int) -> None:
    connection = pika.BlockingConnection(pika.URLParameters(RABBIT_URL))
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue=QUEUE_INDEX_REQUESTED, durable=True)
    channel.queue_bind(
        queue=QUEUE_INDEX_REQUESTED, exchange=EXCHANGE, routing_key=ROUTING_INDEX_REQUESTED
    )
    channel.queue_purge(QUEUE_INDEX_REQUESTED)
    channel.basic_publish(
        exchange=EXCHANGE,
        routing_key=ROUTING_INDEX_REQUESTED,
        body=json.dumps(
            {"documentId": document_id, "ownerId": owner_id, "version": version}
        ).encode("utf-8"),
    )
    connection.close()


def test_full_pipeline_end_to_end(composition):
    owner = "owner-e2e"
    document_id = "doc-e2e"

    # Listener do evento de conclusão — amarrado ANTES de processar.
    connection = pika.BlockingConnection(pika.URLParameters(RABBIT_URL))
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    completed_queue = channel.queue_declare(queue="", exclusive=True).method.queue
    channel.queue_bind(
        queue=completed_queue, exchange=EXCHANGE, routing_key=ROUTING_INDEX_COMPLETED
    )

    # 1) Nest publica o pedido de indexação.
    _publish_requested(document_id, owner, version=1)

    # 2) Worker processa uma mensagem (pipeline real inteiro).
    processed = composition.index_consumer().process_pending(max_messages=1, timeout=10)
    assert processed == 1

    # 3) Recebe o document.index.completed.
    body = None
    for _ in range(80):
        method, _props, body = channel.basic_get(queue=completed_queue, auto_ack=True)
        if method is not None:
            break
        time.sleep(0.1)
    connection.close()

    assert body is not None
    completed = json.loads(body)
    assert completed["documentId"] == document_id
    assert completed["status"] == "ready"
    assert completed["chunkCount"] >= 1

    # 4) Busca encontra o documento indexado (mesmo dono).
    search = composition.search_documents()
    hits = search.execute(
        SearchQuery(query="qual a origem do café e a lenda de Kaldi?", owner_id=owner)
    )
    assert hits
    assert hits[0].document_id == document_id
    assert hits[0].snippet

    # 5) Outro dono NÃO enxerga o documento (multi-tenant).
    outros = search.execute(SearchQuery(query="origem do café", owner_id="owner-outro"))
    assert outros == []
