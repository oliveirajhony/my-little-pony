"""Adapter da porta AnswerGenerator para APIs compatíveis com OpenAI.

Fala o protocolo `/chat/completions` — o mesmo de OpenAI, Groq, OpenRouter,
Together, e servidores locais como vLLM ou LM Studio. A escolha entre o LLM
local (Ollama) e uma API hospedada é só configuração (RAG_LLM_BACKEND), sem
mudar o domínio: mesma porta, mesmo system prompt anti-alucinação.

Chamada HTTP síncrona (httpx) — o endpoint /answer roda em threadpool.
"""

from __future__ import annotations

import json
from collections.abc import Iterator

import httpx

from rag_service.adapters.outbound.answer_prompt import SYSTEM_PROMPT, build_user_message


class OpenAiAnswerGenerator:
    def __init__(
        self,
        base_url: str,
        model: str,
        api_key: str = "",
        timeout: float = 60.0,
        client: httpx.Client | None = None,
    ) -> None:
        # base_url é a raiz da API (ex.: https://api.openai.com/v1); o path do
        # chat completions é anexado aqui para o chamador só configurar a base.
        self._url = f"{base_url.rstrip('/')}/chat/completions"
        self._model = model
        self._api_key = api_key
        self._client = client or httpx.Client(timeout=timeout)

    def _headers(self) -> dict:
        # Endpoints locais (vLLM/LM Studio) muitas vezes não exigem chave; só
        # envia o header quando há uma.
        return {"Authorization": f"Bearer {self._api_key}"} if self._api_key else {}

    def _body(self, query: str, context: str, *, stream: bool) -> dict:
        return {
            "model": self._model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_message(query, context)},
            ],
            "temperature": 0.1,
            "stream": stream,
        }

    def generate(self, query: str, context: str) -> str:
        response = self._client.post(
            self._url, headers=self._headers(), json=self._body(query, context, stream=False)
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()

    def generate_stream(self, query: str, context: str) -> Iterator[str]:
        with self._client.stream(
            "POST", self._url, headers=self._headers(), json=self._body(query, context, stream=True)
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[len("data:") :].strip()
                if data == "[DONE]":
                    break
                # Chunks legítimos podem vir sem choices (ex.: frame final de
                # usage quando stream_options.include_usage, ou keepalive de proxy).
                choices = json.loads(data).get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta", {})
                piece = delta.get("content", "")
                if piece:
                    yield piece
