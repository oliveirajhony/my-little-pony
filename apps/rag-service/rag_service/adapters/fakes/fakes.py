"""Adapters fake (em memória) para testar os casos de uso sem infra.

Não são semanticamente perfeitos — são determinísticos e suficientes para
exercitar o fluxo do hexágono (indexar, filtrar por dono, rerankear, buscar).
"""

from __future__ import annotations

import hashlib
import math
import re

from rag_service.domain.models import (
    Chunk,
    EmbeddedChunk,
    IndexResult,
    RawDocument,
    RawHit,
    SparseVector,
)

_DENSE_DIM = 64
_TOKEN_RE = re.compile(r"\w+", re.UNICODE)
_BLOCK_RE = re.compile(r"<(h[1-6]|p|li)[^>]*>(.*?)</\1>", re.IGNORECASE | re.DOTALL)
_TAG_RE = re.compile(r"<[^>]+>")


def _tokens(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def _stable_hash(token: str) -> int:
    """Hash determinístico (o hash() embutido varia entre processos)."""
    return int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)


class FakeDocumentSource:
    """Fonte em memória (mapa document_id -> HTML ou RawDocument)."""

    def __init__(self, docs: dict[str, str | RawDocument]) -> None:
        self._docs = docs

    def fetch(self, document_id: str) -> RawDocument:
        if document_id not in self._docs:
            raise KeyError(f"documento não encontrado: {document_id}")
        value = self._docs[document_id]
        if isinstance(value, RawDocument):
            return value
        return RawDocument(filename="document.html", data=value.encode("utf-8"))


class FakeBlobStorage:
    """Object storage em memória (mapa chave -> bytes)."""

    def __init__(self, blobs: dict[str, bytes] | None = None) -> None:
        self._blobs = blobs or {}

    def put(self, key: str, data: bytes) -> None:
        self._blobs[key] = data

    def get(self, key: str) -> bytes:
        if key not in self._blobs:
            raise KeyError(f"blob não encontrado: {key}")
        return self._blobs[key]


class FakeChunker:
    """Chunker simples: decodifica o conteúdo e cada bloco HTML (h1-6/p/li) vira
    um chunk. O último heading vira o `contextualized_text` (prefixo)."""

    def chunk(self, source: RawDocument) -> list[Chunk]:
        html = source.data.decode("utf-8", errors="replace")
        chunks: list[Chunk] = []
        last_heading = ""
        index = 0

        for match in _BLOCK_RE.finditer(html):
            tag = match.group(1).lower()
            text = _TAG_RE.sub("", match.group(2)).strip()

            if not text:
                continue

            if tag.startswith("h"):
                last_heading = text

            index += 1
            contextualized = f"{last_heading}\n{text}".strip() if last_heading else text
            headings = [last_heading] if last_heading else []
            chunks.append(
                Chunk(
                    chunk_id=f"chunk-{index}",
                    index=index,
                    text=text,
                    contextualized_text=contextualized,
                    headings=headings,
                )
            )

        return chunks


class FakeDenseEmbedder:
    """Embedding denso fake: bag-of-words hasheado num vetor fixo, normalizado.

    Textos parecidos geram vetores próximos (cosseno alto) — suficiente para
    validar a busca. `embedded_count` conta quantos textos foram embedados
    (para os testes verificarem a retomada incremental)."""

    def __init__(self) -> None:
        self.embedded_count = 0

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        self.embedded_count += len(texts)
        return [self._vector(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._vector(text)

    def _vector(self, text: str) -> list[float]:
        vector = [0.0] * _DENSE_DIM
        for token in _tokens(text):
            vector[_stable_hash(token) % _DENSE_DIM] += 1.0

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]


class FakeSparseEmbedder:
    """Embedding esparso fake: contagem de tokens (posição = hash do token)."""

    def embed_documents(self, texts: list[str]) -> list[SparseVector]:
        return [self._vector(text) for text in texts]

    def embed_query(self, text: str) -> SparseVector:
        return self._vector(text)

    def _vector(self, text: str) -> SparseVector:
        counts: dict[int, float] = {}
        for token in _tokens(text):
            position = _stable_hash(token) % 100_000
            counts[position] = counts.get(position, 0.0) + 1.0
        return SparseVector(indices=list(counts.keys()), values=list(counts.values()))


class InMemoryVectorIndex:
    """Índice vetorial em memória com filtro por dono e similaridade de cosseno."""

    def __init__(self) -> None:
        self._chunks: list[EmbeddedChunk] = []
        self.upsert_calls = 0  # nº de lotes gravados (checkpoints)

    def current_version(self, document_id: str) -> int | None:
        versions = [c.version for c in self._chunks if c.document_id == document_id]
        return max(versions) if versions else None

    def count(self, document_id: str) -> int:
        return sum(1 for c in self._chunks if c.document_id == document_id)

    def already_indexed(
        self, document_id: str, version: int, chunk_ids: list[str]
    ) -> set[str]:
        wanted = set(chunk_ids)
        return {
            c.chunk.chunk_id
            for c in self._chunks
            if c.document_id == document_id
            and c.version == version
            and c.chunk.chunk_id in wanted
        }

    def delete_other_versions(self, document_id: str, keep_version: int) -> None:
        self._chunks = [
            c
            for c in self._chunks
            if c.document_id != document_id or c.version == keep_version
        ]

    def delete_document(self, document_id: str) -> None:
        self._chunks = [c for c in self._chunks if c.document_id != document_id]

    def upsert(self, chunks: list[EmbeddedChunk]) -> None:
        self.upsert_calls += 1
        # Idempotente por (document_id, version, chunk_id), como o Qdrant (id estável).
        keys = {(c.document_id, c.version, c.chunk.chunk_id) for c in chunks}
        self._chunks = [
            existing
            for existing in self._chunks
            if (existing.document_id, existing.version, existing.chunk.chunk_id) not in keys
        ]
        self._chunks.extend(chunks)

    def search(
        self,
        dense: list[float],
        sparse: SparseVector,
        owner_id: str,
        filters: dict,
        limit: int,
    ) -> list[RawHit]:
        # Multi-tenant: só chunks do dono.
        scored: list[RawHit] = []
        for chunk in self._chunks:
            if chunk.owner_id != owner_id:
                continue
            score = _cosine(dense, chunk.dense)
            scored.append(
                RawHit(
                    document_id=chunk.document_id,
                    chunk_id=chunk.chunk.chunk_id,
                    score=score,
                    text=chunk.chunk.text,
                )
            )

        scored.sort(key=lambda hit: hit.score, reverse=True)
        return scored[:limit]

    # Auxiliar para os testes.
    def all(self) -> list[EmbeddedChunk]:
        return list(self._chunks)


class LexicalReranker:
    """Reranker fake: reordena por sobreposição de tokens query x texto."""

    def rerank(self, query: str, hits: list[RawHit]) -> list[RawHit]:
        query_tokens = set(_tokens(query))
        rescored = [
            RawHit(
                document_id=hit.document_id,
                chunk_id=hit.chunk_id,
                score=float(len(query_tokens & set(_tokens(hit.text)))),
                text=hit.text,
            )
            for hit in hits
        ]
        rescored.sort(key=lambda hit: hit.score, reverse=True)
        return rescored


class RecordingPublisher:
    """Publisher fake: guarda os resultados publicados (para asserção)."""

    def __init__(self) -> None:
        self.published: list[IndexResult] = []

    def publish_completed(self, result: IndexResult, correlation_id: str | None = None) -> None:
        self.published.append(result)

    @property
    def last(self) -> IndexResult:
        return self.published[-1]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
