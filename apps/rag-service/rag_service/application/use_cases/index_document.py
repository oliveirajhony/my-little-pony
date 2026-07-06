"""Caso de uso: indexar um documento (INCREMENTAL / resumível).

Fluxo:
  guard de version -> buscar HTML -> chunkar -> embedar SÓ os chunks faltantes
  -> upsert -> limpar versões antigas.

Design (pós-auditoria):
  - PURO: retorna IndexResult em sucesso e LEVANTA em falha. A publicação de
    document.index.completed e o retry/DLQ são orquestração do consumer.
  - Retomada incremental: o índice é o checkpoint. Após uma falha na MESMA
    versão, só se embeda o que ainda não foi indexado (chunks grandes não
    reprocessam tudo). Chunking é determinístico → chunk_id estável por versão.
  - Guard de version:
      version <  current  -> evento stale: confirma ready (não regride, não
                             deixa o Nest pendurado se o completed se perdeu).
      version >= current  -> processa incrementalmente (== current = retomada).
  - Troca de versão (version > current) limpa os chunks da versão antiga.
"""

from __future__ import annotations

import logging

from rag_service.application.ports import (
    Chunker,
    DenseEmbedder,
    DocumentSource,
    SparseEmbedder,
    VectorIndex,
)
from rag_service.domain.models import EmbeddedChunk, IndexResult

logger = logging.getLogger(__name__)


class IndexDocument:
    def __init__(
        self,
        source: DocumentSource,
        chunker: Chunker,
        dense: DenseEmbedder,
        sparse: SparseEmbedder,
        index: VectorIndex,
        batch_size: int = 64,
    ) -> None:
        self._source = source
        self._chunker = chunker
        self._dense = dense
        self._sparse = sparse
        self._index = index
        self._batch_size = batch_size

    def execute(self, document_id: str, owner_id: str, version: int) -> IndexResult:
        """Indexa incrementalmente. Retorna ready; LEVANTA em falha real."""
        current = self._index.current_version(document_id)

        # Evento genuinamente antigo: não regride, mas CONFIRMA ready (idempotente)
        # para não deixar o Nest preso se o completed original se perdeu.
        if current is not None and version < current:
            logger.info(
                "↷ Evento stale de %s (versão %s < indexada %s): confirmando ready",
                document_id,
                version,
                current,
            )
            return IndexResult.ready(document_id, self._index.count(document_id), embedded_count=0)

        logger.info("▶ Indexando %s (owner=%s, version=%s)", document_id, owner_id, version)

        raw = self._source.fetch(document_id)
        chunks = self._chunker.chunk(raw)
        logger.info(
            "  1/3 fonte '%s' (%d bytes) chunkada: %d chunks",
            raw.filename,
            len(raw.data),
            len(chunks),
        )

        if not chunks:
            self._index.delete_other_versions(document_id, keep_version=version)
            logger.info("  documento sem conteúdo indexável; 0 chunks")
            return IndexResult.ready(document_id, 0, embedded_count=0)

        # Retomada: descobre o que já está indexado (nesta versão) e embeda só o resto.
        chunk_ids = [chunk.chunk_id for chunk in chunks]
        already = self._index.already_indexed(document_id, version, chunk_ids)
        missing = [chunk for chunk in chunks if chunk.chunk_id not in already]

        if missing:
            # Em LOTES: cada upsert é um checkpoint. Um crash entre lotes
            # preserva os já gravados; a retomada continua do ponto seguinte.
            done = 0
            for start in range(0, len(missing), self._batch_size):
                batch = missing[start : start + self._batch_size]
                texts = [chunk.contextualized_text for chunk in batch]
                dense_vectors = self._dense.embed_documents(texts)
                sparse_vectors = self._sparse.embed_documents(texts)
                self._index.upsert(
                    [
                        EmbeddedChunk(
                            document_id=document_id,
                            owner_id=owner_id,
                            version=version,
                            chunk=chunk,
                            dense=dense_vector,
                            sparse=sparse_vector,
                        )
                        for chunk, dense_vector, sparse_vector in zip(
                            batch, dense_vectors, sparse_vectors, strict=False
                        )
                    ]
                )
                done += len(batch)
                logger.info(
                    "  2/3 lote gravado: +%d (%d/%d embedados; %d já existiam)",
                    len(batch),
                    done,
                    len(missing),
                    len(already),
                )
        else:
            logger.info("  2/3 nada a embedar: os %d chunks já estavam indexados", len(chunks))

        # Limpa chunks de versões anteriores (troca de versão).
        self._index.delete_other_versions(document_id, keep_version=version)
        logger.info("  3/3 versões antigas removidas; documento em v%s", version)

        return IndexResult.ready(document_id, len(chunks), embedded_count=len(missing))
