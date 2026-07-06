"""Entidades e value objects do domínio.

Tudo imutável (frozen) onde faz sentido. Sem dependência de infra.
"""

from __future__ import annotations

from dataclasses import dataclass, field


# --------------------------------------------------------------------------- #
# Vetores
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class SparseVector:
    """Vetor esparso (lexical/BM25): posições e pesos."""

    indices: list[int]
    values: list[float]


# --------------------------------------------------------------------------- #
# Documento bruto (fonte a extrair)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class RawDocument:
    """Conteúdo bruto de um documento antes da extração.

    `filename` permite ao Docling detectar o formato (ex.: "relatorio.pdf",
    "planilha.xlsx", "document.html"). Unifica HTML nativo e arquivos enviados.
    """

    filename: str
    data: bytes


# --------------------------------------------------------------------------- #
# Chunk (unidade indexável)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Chunk:
    """Trecho de um documento, ainda sem embedding.

    `text` é o conteúdo puro; `contextualized_text` inclui os headings da seção
    (é o que vira embedding, como no v2).
    """

    chunk_id: str
    index: int
    text: str
    contextualized_text: str
    headings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class EmbeddedChunk:
    """Chunk pronto para indexar: carimbado com dono/documento/versão + vetores.

    O `owner_id` no payload é o que torna a busca multi-tenant (filtro por dono).
    """

    document_id: str
    owner_id: str
    version: int
    chunk: Chunk
    dense: list[float]
    sparse: SparseVector
    # Fonte indexável: "native" (documento do editor) ou "file" (arquivo importado).
    kind: str = "native"


# --------------------------------------------------------------------------- #
# Busca
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class SearchQuery:
    query: str
    owner_id: str
    filters: dict = field(default_factory=dict)
    top_k: int = 5


@dataclass(frozen=True)
class RawHit:
    """Resultado bruto vindo do índice vetorial (antes do rerank).

    Carrega o texto para permitir rerank e recorte de snippet.
    """

    document_id: str
    chunk_id: str
    score: float
    text: str
    kind: str = "native"


@dataclass(frozen=True)
class SearchHit:
    """Resultado final exposto pela API (contrato com o Nest)."""

    document_id: str
    chunk_id: str
    score: float
    snippet: str
    kind: str = "native"


# --------------------------------------------------------------------------- #
# Resultado de indexação (contrato do evento document.index.completed)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class IndexResult:
    document_id: str
    status: str  # "ready" | "failed"
    chunk_count: int  # total de chunks do documento (após indexar)
    error: str | None = None
    # Quantos chunks foram REALMENTE embedados nesta execução. 0 = nada a fazer
    # (evento stale ou tudo já indexado). Permite retomada incremental.
    embedded_count: int = 0
    # Ecoado no document.index.completed para o Nest saber qual tabela marcar.
    kind: str = "native"

    @staticmethod
    def ready(
        document_id: str, chunk_count: int, embedded_count: int = 0, kind: str = "native"
    ) -> IndexResult:
        return IndexResult(
            document_id=document_id,
            status="ready",
            chunk_count=chunk_count,
            embedded_count=embedded_count,
            kind=kind,
        )

    @staticmethod
    def failed(document_id: str, error: str, kind: str = "native") -> IndexResult:
        return IndexResult(
            document_id=document_id, status="failed", chunk_count=0, error=error, kind=kind
        )
