"""Cliente HTTP da API interna do Nest.

Contrato (auth de serviço via X-Internal-Token):
    GET /internal/documents/{id}/content
        nativo  -> 200 { "kind": "native", "content": "<html>", "filename"?: str }
    GET /internal/source-files/{id}/content
        arquivo -> 200 { "kind": "file", "storageKey": str, "filename": str }

O `kind` do evento escolhe o endpoint. Devolve o descriptor cru; a montagem do
RawDocument fica no NestDocumentSource.
"""

from __future__ import annotations

import httpx

# Segmento do path por tipo de fonte indexável.
_PATH_BY_KIND = {"native": "documents", "file": "source-files"}


class NestContentClient:
    def __init__(
        self,
        base_url: str,
        service_token: str,
        client: httpx.Client | None = None,
        timeout: float = 10.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._headers = {"X-Internal-Token": service_token}
        self._client = client or httpx.Client(timeout=timeout)

    def fetch_descriptor(self, document_id: str, kind: str = "native") -> dict:
        segment = _PATH_BY_KIND.get(kind, "documents")
        url = f"{self._base_url}/internal/{segment}/{document_id}/content"
        response = self._client.get(url, headers=self._headers)
        response.raise_for_status()
        return response.json()
