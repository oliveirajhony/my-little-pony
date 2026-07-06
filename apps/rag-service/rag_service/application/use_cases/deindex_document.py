"""Caso de uso: de-indexar uma fonte (documento ou arquivo) removida.

Descarta todos os vetores do document_id no índice. Idempotente: chamar de
novo num id já removido é no-op. Acionado por document.deindex.requested.
"""

from __future__ import annotations

import logging

from rag_service.application.ports import VectorIndex

logger = logging.getLogger(__name__)


class DeindexDocument:
    def __init__(self, index: VectorIndex) -> None:
        self._index = index

    def execute(self, document_id: str) -> None:
        self._index.delete_document(document_id)
        logger.info("🗑 de-indexado %s (vetores removidos)", document_id)
