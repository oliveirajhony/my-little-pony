"""Adapter da porta AnswerGenerator usando um LLM local via Ollama.

Porta do v2/responder.py: system prompt anti-alucinação (só o contexto, cita
[n], recusa se não estiver no contexto), temperatura baixa e resposta em pt-BR.
Chamada HTTP síncrona (httpx) — o endpoint /answer roda em threadpool.
"""

from __future__ import annotations

import httpx

SYSTEM_PROMPT = (
    "Você é um assistente de perguntas e respostas sobre documentos. "
    "Responda SOMENTE com base nos trechos fornecidos no CONTEXTO. "
    "Regras obrigatórias:\n"
    "1. Use apenas informações presentes no CONTEXTO. NUNCA invente ou use "
    "conhecimento externo.\n"
    "2. Cite a fonte de cada afirmação com o número entre colchetes, ex.: [1], [2].\n"
    "3. Se a resposta não estiver no CONTEXTO, responda exatamente: "
    "'Não encontrei essa informação nos documentos.'\n"
    "4. Responda em português, de forma objetiva e direta."
)


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

    def generate(self, query: str, context: str) -> str:
        response = self._client.post(
            self._url,
            json={
                "model": self._model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"CONTEXTO:\n{context}\n\nPERGUNTA: {query}"},
                ],
                "stream": False,
                "options": {"temperature": 0.1},
            },
        )
        response.raise_for_status()
        return response.json()["message"]["content"].strip()
