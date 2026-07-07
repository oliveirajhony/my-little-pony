"""Guard de single-flight para a geração do LLM (um por vez em CPU).

Serializa gerações, reporta a posição na fila e recusa (QueueFullError) quando a
fila passa do teto — evita conexões acumulando sem fim e afogando o serviço.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager


class QueueFullError(Exception):
    """Fila de espera cheia — recuse a requisição em vez de enfileirar."""


class SingleFlightGuard:
    def __init__(self, limit: int, max_depth: int, max_wait_s: float) -> None:
        self._sem = asyncio.Semaphore(limit)
        self._max_depth = max_depth
        self._max_wait_s = max_wait_s
        self._waiting = 0

    @asynccontextmanager
    async def slot(self):
        if self._sem.locked():
            if self._waiting >= self._max_depth:
                raise QueueFullError()
            self._waiting += 1
            position = self._waiting
            try:
                await asyncio.wait_for(self._sem.acquire(), timeout=self._max_wait_s)
            except TimeoutError as exc:
                # Esperou o teto e não conseguiu o slot: é backpressure, não um
                # crash. Trata como fila cheia para o endpoint responder limpo.
                raise QueueFullError() from exc
            finally:
                self._waiting -= 1
        else:
            position = 0
            await self._sem.acquire()
        try:
            yield position
        finally:
            self._sem.release()
