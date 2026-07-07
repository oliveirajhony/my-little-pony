"""Adapter da porta AnswerGenerator usando um LLM local via Ollama.

Porta do v2/responder.py: system prompt anti-alucinação (só o contexto, cita
[n], recusa se não estiver no contexto), temperatura baixa e resposta em pt-BR.
O prompt é compartilhado com o backend OpenAI-compatível (answer_prompt), então
trocar de LLM local para API não muda as instruções.
Chamada HTTP síncrona (httpx) — o endpoint /answer roda em threadpool.
"""

from __future__ import annotations

import json
from collections.abc import Iterator

import httpx

from rag_service.adapters.outbound.answer_prompt import SYSTEM_PROMPT, build_user_message


class OllamaAnswerGenerator:
    def __init__(
        self,
        url: str,
        model: str,
        timeout: float = 300.0,
        client: httpx.Client | None = None,
    ) -> None:
        self._url = url
        self._model = model
        self._client = client or httpx.Client(timeout=timeout)

    def _body(self, query: str, context: str, *, stream: bool) -> dict:
        return {
            "model": self._model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_message(query, context)},
            ],
            "stream": stream,
            "options": {"temperature": 0.1},
        }

    def generate(self, query: str, context: str) -> str:
        response = self._client.post(self._url, json=self._body(query, context, stream=False))
        response.raise_for_status()
        return response.json()["message"]["content"].strip()

    def generate_stream(self, query: str, context: str) -> Iterator[str]:
        with self._client.stream(
            "POST", self._url, json=self._body(query, context, stream=True)
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line:
                    continue
                chunk = json.loads(line)
                piece = chunk.get("message", {}).get("content", "")
                if piece:
                    yield piece
