"""Adapter da porta DocumentSource.

Resolve a fonte de um documento a partir do descriptor do Nest:
  - kind "native": o HTML vem inline no descriptor;
  - kind "file":  lê os bytes do object storage (MinIO) pela storageKey.

Compõe o cliente do Nest (metadados/verdade) com o blob storage (bytes).
O Python só LÊ — o Nest é o único a escrever no Postgres/storage.
"""

from __future__ import annotations

from rag_service.adapters.outbound.nest_content_client import NestContentClient
from rag_service.application.ports import BlobStorage
from rag_service.domain.models import RawDocument


class NestDocumentSource:
    def __init__(self, nest_client: NestContentClient, blob_storage: BlobStorage) -> None:
        self._nest = nest_client
        self._blobs = blob_storage

    def fetch(self, document_id: str, kind: str = "native") -> RawDocument:
        descriptor = self._nest.fetch_descriptor(document_id, kind)
        kind = descriptor.get("kind", kind)

        if kind == "file":
            storage_key = descriptor["storageKey"]
            filename = descriptor.get("filename") or storage_key.rsplit("/", 1)[-1]
            return RawDocument(filename=filename, data=self._blobs.get(storage_key))

        # nativo: HTML inline
        filename = descriptor.get("filename") or "document.html"
        content = descriptor.get("content") or ""
        return RawDocument(filename=filename, data=content.encode("utf-8"))
