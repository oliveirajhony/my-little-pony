"""Framing SSE: uma linha data: por evento, JSON com campo `type`."""

from __future__ import annotations

import json


def sse_line(payload: dict) -> str:
    # json.dumps escapa \n → o data: é sempre uma única linha (sem injeção de frame).
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
