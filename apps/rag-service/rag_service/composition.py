"""Composition root: monta os casos de uso com os adapters reais.

É o ÚNICO lugar que conhece adapters + domínio ao mesmo tempo (a fiação). Os
modelos pesados são criados sob demanda e reutilizados (uma vez por processo).
"""

from __future__ import annotations

from rag_service.adapters.inbound.rabbit_consumer import RabbitIndexConsumer
from rag_service.adapters.outbound.bge_dense_embedder import BgeM3DenseEmbedder
from rag_service.adapters.outbound.bge_reranker import BgeReranker
from rag_service.adapters.outbound.bm25_sparse_embedder import Bm25SparseEmbedder
from rag_service.adapters.outbound.docling_chunker import DoclingChunker
from rag_service.adapters.outbound.minio_blob_storage import MinioBlobStorage
from rag_service.adapters.outbound.nest_content_client import NestContentClient
from rag_service.adapters.outbound.nest_document_source import NestDocumentSource
from rag_service.adapters.outbound.ollama_answer_generator import OllamaAnswerGenerator
from rag_service.adapters.outbound.qdrant_index import QdrantServerIndex
from rag_service.adapters.outbound.rabbit_publisher import RabbitEventPublisher
from rag_service.adapters.outbound.tei_dense_embedder import TeiDenseEmbedder
from rag_service.application.ports import DenseEmbedder
from rag_service.application.use_cases import (
    AnswerQuestion,
    DeindexDocument,
    IndexDocument,
    SearchDocuments,
)
from rag_service.config import Settings


class Composition:
    def __init__(self, settings: Settings) -> None:
        self._s = settings
        self._dense: DenseEmbedder | None = None
        self._sparse: Bm25SparseEmbedder | None = None
        self._reranker: BgeReranker | None = None
        self._index: QdrantServerIndex | None = None
        self._chunker: DoclingChunker | None = None
        self._source: NestDocumentSource | None = None
        self._publisher: RabbitEventPublisher | None = None
        self._answer_generator: OllamaAnswerGenerator | None = None

    # --- adapters (singletons preguiçosos) --- #
    def dense(self) -> DenseEmbedder:
        if self._dense is None:
            if self._s.dense_backend == "http":
                # Serviço de embeddings dedicado (TEI): não carrega modelo aqui.
                self._dense = TeiDenseEmbedder(self._s.dense_service_url)
            else:
                self._dense = BgeM3DenseEmbedder(self._s.dense_model, device=self._s.device)
        return self._dense

    def sparse(self) -> Bm25SparseEmbedder:
        if self._sparse is None:
            self._sparse = Bm25SparseEmbedder(self._s.sparse_model)
        return self._sparse

    def reranker(self) -> BgeReranker:
        if self._reranker is None:
            self._reranker = BgeReranker(self._s.rerank_model, device=self._s.device)
        return self._reranker

    def index(self) -> QdrantServerIndex:
        if self._index is None:
            self._index = QdrantServerIndex(
                url=self._s.qdrant_url,
                collection=self._s.qdrant_collection,
                dense_dim=self._s.dense_dim,
            )
        return self._index

    def chunker(self) -> DoclingChunker:
        if self._chunker is None:
            self._chunker = DoclingChunker()
        return self._chunker

    def source(self) -> NestDocumentSource:
        if self._source is None:
            nest = NestContentClient(self._s.nest_base_url, self._s.nest_service_token)
            blobs = MinioBlobStorage(
                endpoint=self._s.minio_endpoint,
                access_key=self._s.minio_access_key,
                secret_key=self._s.minio_secret_key,
                bucket=self._s.minio_bucket,
                secure=self._s.minio_secure,
            )
            self._source = NestDocumentSource(nest, blobs)
        return self._source

    def publisher(self) -> RabbitEventPublisher:
        if self._publisher is None:
            self._publisher = RabbitEventPublisher(
                self._s.rabbitmq_url, heartbeat=self._s.rabbitmq_heartbeat
            )
        return self._publisher

    def answer_generator(self) -> OllamaAnswerGenerator:
        if self._answer_generator is None:
            self._answer_generator = OllamaAnswerGenerator(
                url=self._s.ollama_url,
                model=self._s.llm_model,
                timeout=self._s.ollama_timeout,
            )
        return self._answer_generator

    # --- casos de uso --- #
    def index_document(self) -> IndexDocument:
        return IndexDocument(
            source=self.source(),
            chunker=self.chunker(),
            dense=self.dense(),
            sparse=self.sparse(),
            index=self.index(),
            batch_size=self._s.index_batch_size,
        )

    def search_documents(self) -> SearchDocuments:
        return SearchDocuments(
            dense=self.dense(),
            sparse=self.sparse(),
            index=self.index(),
            reranker=self.reranker(),
        )

    def deindex_document(self) -> DeindexDocument:
        return DeindexDocument(index=self.index())

    def answer_question(self) -> AnswerQuestion:
        return AnswerQuestion(
            dense=self.dense(),
            sparse=self.sparse(),
            index=self.index(),
            reranker=self.reranker(),
            generator=self.answer_generator(),
            min_score=self._s.answer_min_score,
            top_k=self._s.answer_top_k,
            max_context_chars=self._s.answer_max_context_chars,
        )

    # --- adapters de entrada --- #
    def index_consumer(self) -> RabbitIndexConsumer:
        return RabbitIndexConsumer(
            url=self._s.rabbitmq_url,
            index_document=self.index_document(),
            publisher=self.publisher(),
            deindex_document=self.deindex_document(),
            max_retries=self._s.max_retries,
            retry_ttl_ms=self._s.retry_ttl_ms,
            heartbeat=self._s.rabbitmq_heartbeat,
        )
