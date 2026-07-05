"""Entrypoint do worker: consome a fila de indexação (loop bloqueante).

Rodar:
    python -m rag_service.main_worker
"""

from __future__ import annotations

import logging

from prometheus_client import start_http_server

from rag_service.composition import Composition
from rag_service.config import get_settings
from rag_service.observability import configure_json_logging


def main() -> None:
    configure_json_logging(logging.INFO)

    settings = get_settings()

    # Expõe /metrics (Prometheus) numa porta HTTP dedicada do worker.
    start_http_server(settings.worker_metrics_port)
    logging.getLogger(__name__).info(
        "métricas em http://0.0.0.0:%d/metrics", settings.worker_metrics_port
    )

    consumer = Composition(settings).index_consumer()
    consumer.start()


if __name__ == "__main__":
    main()
