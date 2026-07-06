"""Cliente HTTP da API interna do Nest.

Contrato (Spec 1/2, §8):
    GET /internal/documents/{id}/content   (auth de serviço via X-Internal-Token)
    nativo  -> 200 { "kind": "native", "content": "<html>", "filename"?: str }
    arquivo -> 200 { "kind": "file", "storageKey": str, "filename": str }

Devolve o descriptor cru; a montagem do RawDocument fica no NestDocumentSource.
"""

from __future__ import annotations

import httpx


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

    def fetch_descriptor(self, document_id: str) -> dict:
        url = f"{self._base_url}/internal/documents/{document_id}/content"
        response = self._client.get(url, headers=self._headers)
        response.raise_for_status()
        return response.json()
