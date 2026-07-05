"""Testes do caso de uso IndexDocument (incremental/resumível, com fakes)."""

import pytest

from rag_service.adapters.fakes import (
    FakeChunker,
    FakeDenseEmbedder,
    FakeDocumentSource,
    FakeSparseEmbedder,
    InMemoryVectorIndex,
)
from rag_service.application.use_cases import IndexDocument

HTML = "<h1>Café</h1><p>origem na Etiópia</p><p>a lenda de Kaldi</p>"  # 3 chunks


def build(content: dict[str, str], batch_size: int = 64):
    index = InMemoryVectorIndex()
    dense = FakeDenseEmbedder()
    use_case = IndexDocument(
        source=FakeDocumentSource(content),
        chunker=FakeChunker(),
        dense=dense,
        sparse=FakeSparseEmbedder(),
        index=index,
        batch_size=batch_size,
    )
    return use_case, index, dense


def test_indexes_and_returns_ready():
    use_case, index, dense = build({"doc-1": HTML})

    result = use_case.execute("doc-1", "owner-1", version=1)

    assert result.status == "ready"
    assert result.chunk_count == 3
    assert result.embedded_count == 3
    assert dense.embedded_count == 3


def test_stamps_owner_and_version_on_every_chunk():
    use_case, index, _ = build({"doc-1": HTML})

    use_case.execute("doc-1", "owner-1", version=7)

    assert all(c.owner_id == "owner-1" and c.version == 7 for c in index.all())


def test_reindex_same_version_embeds_nothing():
    use_case, index, dense = build({"doc-1": HTML})

    use_case.execute("doc-1", "owner-1", version=1)
    result = use_case.execute("doc-1", "owner-1", version=1)  # duplicado/retomada completa

    assert result.embedded_count == 0  # tudo já estava indexado
    assert dense.embedded_count == 3  # NÃO embedou de novo
    assert len(index.all()) == 3


def test_resume_embeds_only_missing_chunks():
    use_case, index, dense = build({"doc-1": HTML})

    use_case.execute("doc-1", "owner-1", version=1)  # indexa os 3
    # Simula um crash que deixou 1 chunk sem gravar.
    index._chunks = index._chunks[:-1]
    dense.embedded_count = 0

    result = use_case.execute("doc-1", "owner-1", version=1)  # retomada

    assert result.embedded_count == 1  # só o que faltava
    assert dense.embedded_count == 1
    assert len(index.all()) == 3  # documento completo de novo


def test_new_version_reprocesses_and_cleans_old():
    use_case, index, dense = build({"doc-1": HTML})

    use_case.execute("doc-1", "owner-1", version=1)
    result = use_case.execute("doc-1", "owner-1", version=2)  # nova versão

    assert result.embedded_count == 3  # versão nova = tudo novo
    assert all(c.version == 2 for c in index.all())  # antiga limpa
    assert len(index.all()) == 3  # sem duplicar entre versões


def test_stale_event_confirms_ready_without_reprocessing():
    use_case, index, dense = build({"doc-1": HTML})

    use_case.execute("doc-1", "owner-1", version=5)
    dense.embedded_count = 0
    result = use_case.execute("doc-1", "owner-1", version=3)  # evento antigo

    assert result.status == "ready"  # confirma (não deixa o Nest pendurado)
    assert result.embedded_count == 0
    assert dense.embedded_count == 0  # não reprocessou
    assert all(c.version == 5 for c in index.all())  # não regrediu


def test_indexes_in_batches_as_checkpoints():
    use_case, index, _ = build({"doc-1": HTML}, batch_size=2)  # 3 chunks, lote 2

    use_case.execute("doc-1", "owner-1", version=1)

    # 2 lotes (2 + 1) = 2 checkpoints; um crash entre eles preservaria o 1º.
    assert index.upsert_calls == 2
    assert len(index.all()) == 3


def test_raises_when_content_missing():
    use_case, index, _ = build({})

    with pytest.raises(KeyError):
        use_case.execute("doc-1", "owner-1", version=1)

    assert index.all() == []


def test_empty_html_indexes_zero_chunks():
    use_case, index, _ = build({"doc-1": "<div></div>"})

    result = use_case.execute("doc-1", "owner-1", version=1)

    assert result.status == "ready"
    assert result.chunk_count == 0
    assert index.all() == []
