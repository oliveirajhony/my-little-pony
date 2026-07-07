"""Recorte de trecho para exibição (compartilhado por busca e RAG generativo)."""

from __future__ import annotations

SNIPPET_MAX = 280


def snippet(text: str) -> str:
    """Normaliza espaços e corta em SNIPPET_MAX chars, com reticências."""
    clean = " ".join((text or "").split())
    if len(clean) <= SNIPPET_MAX:
        return clean
    return clean[:SNIPPET_MAX].rstrip() + "…"
