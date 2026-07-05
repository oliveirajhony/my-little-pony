"""Adapter da porta VectorIndex usando Qdrant em modo SERVIDOR.

Cada ponto tem dois vetores nomeados: `dense` (bge-m3) e `bm25` (esparso, com
IDF no servidor). A busca funde os dois por RRF e SEMPRE filtra por `owner_id`
(multi-tenant). Reindex idempotente: id de ponto estável (uuid5) + delete por
document_id antes do upsert.
"""

from __future__ import annotations

from typing import Any
from uuid import NAMESPACE_URL, uuid5

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    Fusion,
    FusionQuery,
    MatchValue,
    Modifier,
    PayloadSchemaType,
    PointStruct,
    Prefetch,
    SparseVectorParams,
    VectorParams,
)
from qdrant_client.models import (
    SparseVector as QdrantSparseVector,
)

from rag_service.domain.models import EmbeddedChunk, RawHit, SparseVector

DENSE_VECTOR = "dense"
SPARSE_VECTOR = "bm25"


class QdrantServerIndex:
    def __init__(
        self,
        url: str,
        collection: str = "documents",
        dense_dim: int = 1024,
        prefetch_limit: int = 50,
    ) -> None:
        self._client = QdrantClient(url=url)
        self._collection = collection
        self._dense_dim = dense_dim
        self._prefetch_limit = prefetch_limit
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        if self._client.collection_exists(self._collection):
            return

        self._client.create_collection(
            collection_name=self._collection,
            vectors_config={
                DENSE_VECTOR: VectorParams(size=self._dense_dim, distance=Distance.COSINE),
            },
            sparse_vectors_config={
                SPARSE_VECTOR: SparseVectorParams(modifier=Modifier.IDF),
            },
        )
        # Índice no payload acelera o filtro por dono (multi-tenant).
        self._client.create_payload_index(
            collection_name=self._collection,
            field_name="owner_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        self._client.create_payload_index(
            collection_name=self._collection,
            field_name="document_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        # version indexada permite limpar versões antigas com eficiência.
        self._client.create_payload_index(
            collection_name=self._collection,
            field_name="version",
            field_schema=PayloadSchemaType.INTEGER,
        )

    def _document_filter(self, document_id: str) -> Filter:
        return Filter(
            must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
        )

    def current_version(self, document_id: str) -> int | None:
        points, _next = self._client.scroll(
            collection_name=self._collection,
            scroll_filter=self._document_filter(document_id),
            limit=1,
            with_payload=True,
            with_vectors=False,
        )
        if not points:
            return None
        return (points[0].payload or {}).get("version")

    def count(self, document_id: str) -> int:
        return self._client.count(
            collection_name=self._collection,
            count_filter=self._document_filter(document_id),
            exact=True,
        ).count

    def already_indexed(
        self, document_id: str, version: int, chunk_ids: list[str]
    ) -> set[str]:
        wanted = set(chunk_ids)
        found: set[str] = set()
        flt = Filter(
            must=[
                FieldCondition(key="document_id", match=MatchValue(value=document_id)),
                FieldCondition(key="version", match=MatchValue(value=version)),
            ]
        )
        offset = None
        while True:
            points, offset = self._client.scroll(
                collection_name=self._collection,
                scroll_filter=flt,
                limit=256,
                with_payload=True,
                with_vectors=False,
                offset=offset,
            )
            for point in points:
                chunk_id = (point.payload or {}).get("chunk_id")
                if chunk_id in wanted:
                    found.add(chunk_id)
            if offset is None:
                break
        return found

    def delete_other_versions(self, document_id: str, keep_version: int) -> None:
        self._client.delete(
            collection_name=self._collection,
            points_selector=Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))],
                must_not=[FieldCondition(key="version", match=MatchValue(value=keep_version))],
            ),
        )

    def delete_document(self, document_id: str) -> None:
        self._client.delete(
            collection_name=self._collection,
            points_selector=Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
            ),
        )

    def upsert(self, chunks: list[EmbeddedChunk]) -> None:
        if not chunks:
            return

        points = [
            PointStruct(
                id=_point_id(chunk.document_id, chunk.version, chunk.chunk.chunk_id),
                vector={
                    DENSE_VECTOR: chunk.dense,
                    SPARSE_VECTOR: QdrantSparseVector(
                        indices=chunk.sparse.indices,
                        values=chunk.sparse.values,
                    ),
                },
                payload={
                    "owner_id": chunk.owner_id,
                    "document_id": chunk.document_id,
                    "chunk_id": chunk.chunk.chunk_id,
                    "version": chunk.version,
                    "index": chunk.chunk.index,
                    "text": chunk.chunk.text,
                    "contextualized_text": chunk.chunk.contextualized_text,
                    "headings": chunk.chunk.headings,
                },
            )
            for chunk in chunks
        ]

        self._client.upsert(collection_name=self._collection, points=points)

    def search(
        self,
        dense: list[float],
        sparse: SparseVector,
        owner_id: str,
        filters: dict,
        limit: int,
    ) -> list[RawHit]:
        query_filter = self._build_filter(owner_id, filters)
        sparse_query = QdrantSparseVector(indices=sparse.indices, values=sparse.values)

        response = self._client.query_points(
            collection_name=self._collection,
            prefetch=[
                Prefetch(
                    query=dense,
                    using=DENSE_VECTOR,
                    limit=self._prefetch_limit,
                    filter=query_filter,
                ),
                Prefetch(
                    query=sparse_query,
                    using=SPARSE_VECTOR,
                    limit=self._prefetch_limit,
                    filter=query_filter,
                ),
            ],
            query=FusionQuery(fusion=Fusion.RRF),
            limit=limit,
            with_payload=True,
        )

        return [
            RawHit(
                document_id=(point.payload or {}).get("document_id", ""),
                chunk_id=(point.payload or {}).get("chunk_id", ""),
                score=point.score,
                text=(point.payload or {}).get("text", ""),
            )
            for point in response.points
        ]

    def _build_filter(self, owner_id: str, filters: dict) -> Filter:
        # owner_id é obrigatório; filtros extras (escalares) são opcionais.
        must: list[Any] = [FieldCondition(key="owner_id", match=MatchValue(value=owner_id))]

        for key, value in (filters or {}).items():
            if isinstance(value, (str, int, bool)):
                must.append(FieldCondition(key=key, match=MatchValue(value=value)))

        return Filter(must=must)


def _point_id(document_id: str, version: int, chunk_id: str) -> str:
    """Id estável por documento+versão+chunk.

    Inclui a versão para que chunks de versões diferentes tenham ids distintos:
    reindexar a mesma versão sobrescreve (retomada); trocar de versão gera ids
    novos e a versão antiga é limpa por delete_other_versions.
    """
    return str(uuid5(NAMESPACE_URL, f"{document_id}::{version}::{chunk_id}"))
