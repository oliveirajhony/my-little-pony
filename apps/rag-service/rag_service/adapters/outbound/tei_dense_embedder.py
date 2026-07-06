"""Adapter da porta DenseEmbedder que chama um serviço de embeddings dedicado.

Compatível com o contrato do HuggingFace Text-Embeddings-Inference (TEI):
    POST /embed  { "inputs": [str, ...] }  ->  [[float, ...], ...]

Motivação (achado P3 da auditoria): carregar o bge-m3 dentro de cada worker
multiplica GBs de RAM/VRAM ao escalar. Extrair os embeddings para um serviço
dedicado (TEI/Triton) permite escalar workers baratos e concentrar a GPU num
lugar. Como a porta já abstrai isto, é um toggle — não toca no domínio.
"""

from __future__ import annotations

import httpx


class TeiDenseEmbedder:
    def __init__(
        self,
        base_url: str,
        client: httpx.Client | None = None,
        timeout: float = 30.0,
    ) -> None:
        self._url = base_url.rstrip("/") + "/embed"
        self._client = client or httpx.Client(timeout=timeout)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._embed([text])[0]

    def _embed(self, texts: list[str]) -> list[list[float]]:
        response = self._client.post(self._url, json={"inputs": texts})
        response.raise_for_status()
        return response.json()
