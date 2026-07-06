"""Adapter da porta Chunker usando o Docling (multi-formato).

O Docling detecta o formato pelo nome do arquivo (PDF, DOCX, XLSX, CSV, HTML,
imagens...) e normaliza tudo num DoclingDocument. Depois o HybridChunker
(config do v2) chunka: tokenizer alinhado ao bge-m3, max_tokens=512, merge_peers
e tabelas serializadas como Markdown.
"""

from __future__ import annotations

from io import BytesIO

from docling.chunking import HybridChunker
from docling.datamodel.document import DocumentStream
from docling.document_converter import DocumentConverter
from docling_core.transforms.chunker.hierarchical_chunker import (
    ChunkingDocSerializer,
    ChunkingSerializerProvider,
)
from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
from docling_core.transforms.serializer.markdown import MarkdownTableSerializer

from rag_service.domain.models import Chunk, RawDocument

EMBEDDING_TOKENIZER = "BAAI/bge-m3"
MAX_TOKENS = 512

# Formatos cobertos nesta versão. Rejeitamos o resto explicitamente para não ter
# formato meio-testado em produção (XLSX/CSV/imagens vêm numa versão futura).
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".html", ".htm", ".md", ".markdown"}


class UnsupportedFormatError(ValueError):
    """Formato de arquivo fora do escopo suportado."""


class _MarkdownTableSerializerProvider(ChunkingSerializerProvider):
    """Faz o chunker serializar tabelas como Markdown (em vez de 'célula=valor')."""

    def get_serializer(self, doc):
        return ChunkingDocSerializer(
            doc=doc,
            table_serializer=MarkdownTableSerializer(),
        )


class DoclingChunker:
    """Implementa Chunker. Modelos pesados são criados uma vez (por worker)."""

    def __init__(
        self,
        tokenizer_model: str = EMBEDDING_TOKENIZER,
        max_tokens: int = MAX_TOKENS,
    ) -> None:
        self._converter = DocumentConverter()
        tokenizer = HuggingFaceTokenizer.from_pretrained(
            model_name=tokenizer_model,
            max_tokens=max_tokens,
        )
        self._chunker = HybridChunker(
            tokenizer=tokenizer,
            merge_peers=True,
            serializer_provider=_MarkdownTableSerializerProvider(),
        )

    def chunk(self, source: RawDocument) -> list[Chunk]:
        self._ensure_supported(source.filename)
        stream = DocumentStream(name=source.filename, stream=BytesIO(source.data))
        document = self._converter.convert(stream).document

        return self._to_chunks(document)

    @staticmethod
    def _ensure_supported(filename: str) -> None:
        ext = filename[filename.rfind(".") :].lower() if "." in filename else ""
        if ext not in SUPPORTED_EXTENSIONS:
            raise UnsupportedFormatError(
                f"formato não suportado: {filename!r} "
                "(suportados nesta versão: pdf, docx, html, md)"
            )

    def _to_chunks(self, document) -> list[Chunk]:
        chunks: list[Chunk] = []
        for index, raw in enumerate(self._chunker.chunk(dl_doc=document), start=1):
            text = getattr(raw, "text", "") or ""
            contextualized = self._chunker.contextualize(chunk=raw)
            meta = getattr(raw, "meta", None)
            headings = list(getattr(meta, "headings", None) or []) if meta else []

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
