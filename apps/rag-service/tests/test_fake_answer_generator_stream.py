from rag_service.adapters.fakes.fakes import FakeAnswerGenerator


def test_fake_stream_yields_same_text_as_generate():
    gen = FakeAnswerGenerator()
    streamed = "".join(gen.generate_stream("q", "[1] a [2] b"))
    assert streamed == "resposta baseada em 2 trecho(s)"


def test_fake_stream_records_call():
    gen = FakeAnswerGenerator()
    list(gen.generate_stream("pergunta", "[1] ctx"))
    assert gen.calls == [("pergunta", "[1] ctx")]
