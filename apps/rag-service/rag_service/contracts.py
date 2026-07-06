"""Contratos de mensageria compartilhados com o backend Nest (Spec 1, §8).

Nomes de evento e payloads em camelCase para casar com o Nest.
"""

# Exchange topic onde trafegam os eventos de indexação.
EXCHANGE = "mlp.documents"

# Nest -> Python: pedido de indexação.
ROUTING_INDEX_REQUESTED = "document.index.requested"
QUEUE_INDEX_REQUESTED = "document.index.requested"
# payload: { "documentId": str, "ownerId": str, "version": int,
#            "kind": "native"|"file" }  (kind ausente => "native", retrocompat.)

# Nest -> Python: pedido de de-indexação (fonte removida). Descarta os vetores.
ROUTING_DEINDEX_REQUESTED = "document.deindex.requested"
QUEUE_DEINDEX_REQUESTED = "document.deindex.requested"
# payload: { "documentId": str, "ownerId": str, "kind": "native"|"file" }

# Python -> Nest: conclusão da indexação.
ROUTING_INDEX_COMPLETED = "document.index.completed"
# payload: { "documentId": str, "status": "ready"|"failed", "chunkCount": int,
#            "kind": "native"|"file", "error"?: str, "correlationId"?: str }

# Fila de retry (backoff via TTL): mensagens ficam RETRY_TTL_MS e voltam à
# fila principal por dead-lettering.
QUEUE_INDEX_RETRY = "document.index.retry"

# Dead-letter queue (parking lot): malformadas ou que esgotaram o retry.
QUEUE_INDEX_DLQ = "document.index.dlq"

# Header com a contagem de tentativas (sobrevive ao dead-lettering).
HEADER_RETRY_COUNT = "x-retry-count"
