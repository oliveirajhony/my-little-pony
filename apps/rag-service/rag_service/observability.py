"""Observabilidade: métricas Prometheus + logging estruturado (JSON).

Sistema distribuído precisa ser rastreável. Métricas contam o que acontece no
pipeline; logs JSON com correlation-id permitem seguir um documento do evento
até a conclusão.
"""

from __future__ import annotations

import json
import logging

from prometheus_client import Counter, Histogram

# --- Métricas do worker (indexação) --- #
DOCS_INDEXED = Counter("rag_documents_indexed_total", "Documentos concluídos com sucesso")
DOCS_FAILED = Counter("rag_documents_failed_total", "Documentos que falharam após esgotar retries")
DOCS_RETRIED = Counter("rag_documents_retried_total", "Retries agendados")
DOCS_PARKED = Counter("rag_documents_parked_total", "Mensagens enviadas à DLQ", ["reason"])
CHUNKS_EMBEDDED = Counter("rag_chunks_embedded_total", "Chunks realmente embedados (só o faltante)")
INDEX_LATENCY = Histogram("rag_index_seconds", "Latência de indexação de um documento")

# --- Métricas da API (busca) --- #
SEARCH_REQUESTS = Counter("rag_search_requests_total", "Buscas realizadas")
SEARCH_LATENCY = Histogram("rag_search_seconds", "Latência da busca")

# --- Métricas da API (RAG generativo / streaming) --- #
ANSWER_STREAM_REQUESTS = Counter(
    "rag_answer_stream_requests_total", "Streams de resposta iniciados"
)
ANSWER_STREAM_ERRORS = Counter(
    "rag_answer_stream_errors_total",
    "Streams encerrados por erro (rotulado pela causa)",
    ["reason"],  # queue_full | idle_timeout | internal
)


class _JsonFormatter(logging.Formatter):
    """Formata cada log como uma linha JSON (ingestão por ELK/Loki/etc.)."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_json_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)
