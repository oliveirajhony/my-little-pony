"""Portas (interfaces) que o domínio exige dos adapters.

Usamos typing.Protocol: os adapters não precisam herdar nada — basta ter a
assinatura (duck typing estrutural). Isso mantém o domínio livre de infra.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Protocol

from rag_service.domain.models import (
    Chunk,
    EmbeddedChunk,
    RawDocument,
    RawHit,
    SparseVector,
)


class DocumentSource(Protocol):
    """Fonte do documento a indexar (HTML nativo OU arquivo enviado).

    No serviço real: consulta o descriptor no Nest e, se for arquivo, lê os
    bytes do object storage. O Python só LÊ."""

    def fetch(self, document_id: str, kind: str = "native") -> RawDocument: ...


class BlobStorage(Protocol):
    """Object storage (MinIO/S3): lê os bytes de um arquivo por chave."""

    def get(self, key: str) -> bytes: ...


class Chunker(Protocol):
    """Converte um documento bruto (qualquer formato) em chunks.

    Adapter real: Docling (PDF, DOCX, XLSX, CSV, HTML, imagens...)."""

    def chunk(self, source: RawDocument) -> list[Chunk]: ...


class DenseEmbedder(Protocol):
    """Embedding semântico (denso). Adapter real: bge-m3."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...


class SparseEmbedder(Protocol):
    """Embedding lexical (esparso). Adapter real: BM25 (fastembed)."""

    def embed_documents(self, texts: list[str]) -> list[SparseVector]: ...

    def embed_query(self, text: str) -> SparseVector: ...


class VectorIndex(Protocol):
    """Índice vetorial. Adapter real: Qdrant (servidor), fusão RRF, filtro por dono.

    O índice também serve de CHECKPOINT: guarda quais chunks (por versão) já
    foram embedados, permitindo retomada incremental após falha.
    """

    def current_version(self, document_id: str) -> int | None:
        """Versão atualmente indexada do documento (None se não indexado).

        Usado como guard contra eventos fora de ordem (não regredir para
        conteúdo mais antigo)."""
        ...

    def count(self, document_id: str) -> int:
        """Quantos chunks o documento tem indexados no momento."""
        ...

    def already_indexed(self, document_id: str, version: int, chunk_ids: list[str]) -> set[str]:
        """Subconjunto de chunk_ids que JÁ existem no índice (doc+versão).

        Base da retomada: só se embeda o que não está aqui."""
        ...

    def delete_other_versions(self, document_id: str, keep_version: int) -> None:
        """Remove chunks de versões diferentes de keep_version (limpa o antigo)."""
        ...

    def delete_document(self, document_id: str) -> None: ...

    def upsert(self, chunks: list[EmbeddedChunk]) -> None: ...

    def search(
        self,
        dense: list[float],
        sparse: SparseVector,
        owner_id: str,
        filters: dict,
        limit: int,
    ) -> list[RawHit]: ...


class Reranker(Protocol):
    """Reordena candidatos por relevância real. Adapter real: bge-reranker-v2-m3.

    Retorna os hits com score atualizado, ordenados do mais relevante ao menos.
    """

    def rerank(self, query: str, hits: list[RawHit]) -> list[RawHit]: ...


class AnswerGenerator(Protocol):
    """Gera uma resposta ancorada no contexto. Adapter real: Ollama (LLM local).

    Recebe a pergunta e o CONTEXTO (trechos numerados) e devolve o texto da
    resposta, instruído a usar só o contexto e citar as fontes com [n]."""

    def generate(self, query: str, context: str) -> str: ...

    def generate_stream(self, query: str, context: str) -> Iterator[str]:
        """Gera a resposta em pedaços (streaming). O síncrono `generate` e este
        compartilham o prompt; são transportes diferentes (não um derivado do outro)."""
        ...


class IndexResultPublisher(Protocol):
    """Publica o resultado da indexação. Adapter real: RabbitMQ
    (document.index.completed)."""

    def publish_completed(self, result, correlation_id: str | None = None) -> None: ...
