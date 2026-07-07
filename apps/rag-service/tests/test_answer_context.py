"""Testes do _build_context: o bloco de contexto do LLM leva o caminho de seção
(headings) à frente do trecho — o que corrige atribuição errada (ex.: associar
uma tecnologia à empresa errada quando trechos de várias entidades se parecem)."""

from rag_service.application.use_cases.answer_question import _build_context
from rag_service.domain.models import RawHit


def _hit(text: str, headings: list[str] | None = None) -> RawHit:
    return RawHit(
        document_id="d",
        chunk_id="c",
        score=1.0,
        text=text,
        headings=headings or [],
    )


def test_prefixa_o_caminho_de_secao_antes_do_trecho():
    hits = [
        _hit(
            "Python · SQL · PHP/Firebird · ZipSign API",
            headings=["Experiência", "Analista de Dados — Toriq", "Stack"],
        )
    ]

    context = _build_context(hits, max_chars=8000)

    assert context.startswith("[1] ")
    # o LLM vê a empresa da seção...
    assert "Analista de Dados — Toriq" in context
    assert "PHP/Firebird" in context
    # ...e o breadcrumb vem ANTES do trecho (é o "onde" do dado)
    assert context.index("Toriq") < context.index("PHP/Firebird")


def test_sem_headings_mantem_apenas_o_trecho():
    assert _build_context([_hit("texto puro")], max_chars=8000) == "[1] texto puro"


def test_numera_multiplos_blocos_com_seus_proprios_caminhos():
    hits = [
        _hit("stack A", headings=["Toriq"]),
        _hit("stack B", headings=["Americanas"]),
    ]

    context = _build_context(hits, max_chars=8000)

    assert "[1] Toriq" in context
    assert "[2] Americanas" in context
