import { Logger } from '@nestjs/common';
import { HttpAnswerGateway } from './http-answer.gateway';

const OK_BODY = {
  answer: 'resposta [1]',
  grounded: true,
  sources: [{ documentId: 'd1', score: 0.9, snippet: 'a', kind: 'file' }],
};

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const ev of it) out.push(ev);
  return out;
}

describe('HttpAnswerGateway', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the not-configured answer without calling fetch when url is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const gateway = new HttpAnswerGateway('', 'tok');

    const result = await gateway.answer({ ownerId: 'u1', q: 'oi' });

    expect(result.grounded).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps the answer and normalizes source kind on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(OK_BODY), { status: 200 }),
    );
    const gateway = new HttpAnswerGateway('http://rag', 'tok');

    const result = await gateway.answer({ ownerId: 'u1', q: 'oi' });

    expect(result.answer).toBe('resposta [1]');
    expect(result.grounded).toBe(true);
    expect(result.sources[0].kind).toBe('file');
  });

  it('sends a timeout AbortSignal and the service bearer token', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(OK_BODY), { status: 200 }));
    const gateway = new HttpAnswerGateway('http://rag', 'tok', 1234);

    await gateway.answer({ ownerId: 'u1', q: 'oi' });

    const [, init] = fetchSpy.mock.calls[0];
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('logs an error (not silence) when the configured service returns non-OK', async () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }));
    const gateway = new HttpAnswerGateway('http://rag', 'tok');

    const result = await gateway.answer({ ownerId: 'u1', q: 'oi' });

    expect(result.grounded).toBe(false); // still degrades gracefully for the user
    expect(errorSpy).toHaveBeenCalledOnce(); // but the failure is now visible
  });

  it('logs an error when the service is unreachable', async () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const gateway = new HttpAnswerGateway('http://rag', 'tok');

    const result = await gateway.answer({ ownerId: 'u1', q: 'oi' });

    expect(result.grounded).toBe(false);
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  describe('answerStream', () => {
    const SSE =
      'data: {"type":"status","stage":"retrieving"}\n\n' +
      'data: {"type":"sources","grounded":true,"sources":[{"documentId":"d1","chunkId":"c1","score":0.9,"snippet":"a","kind":"file"}]}\n\n' +
      'data: {"type":"token","text":"oi"}\n\n' +
      'data: {"type":"token","text":" mundo"}\n\n' +
      'data: {"type":"done","grounded":true}\n\n';

    it('parses the SSE and maps frames to stream events (sources normalized to SearchHit)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(SSE, { status: 200 }));
      const gateway = new HttpAnswerGateway('http://rag', 'tok');

      const events = await collect(gateway.answerStream({ ownerId: 'u1', q: 'oi' }));

      expect(events.map((e) => e.type)).toEqual(['status', 'sources', 'token', 'token', 'done']);
      const sources = events.find((e) => e.type === 'sources');
      // chunkId é descartado; kind normalizado; shape = SearchHit
      expect(sources).toEqual({
        type: 'sources',
        grounded: true,
        sources: [{ documentId: 'd1', score: 0.9, snippet: 'a', kind: 'file' }],
      });
    });

    it('handles a frame split across chunks and multibyte UTF-8', async () => {
      const encoder = new TextEncoder();
      const full =
        'data: {"type":"token","text":"café"}\n\ndata: {"type":"done","grounded":false}\n\n';
      const bytes = encoder.encode(full);
      const cut = 20; // corta no meio do primeiro frame (e do "café")
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes.slice(0, cut));
          controller.enqueue(bytes.slice(cut));
          controller.close();
        },
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, { status: 200 }));
      const gateway = new HttpAnswerGateway('http://rag', 'tok');

      const events = await collect(gateway.answerStream({ ownerId: 'u1', q: 'oi' }));
      const token = events.find((e) => e.type === 'token') as { text: string };
      expect(token.text).toBe('café');
    });

    it('yields a graceful ungrounded stream when the service is not configured', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const gateway = new HttpAnswerGateway('', 'tok');

      const events = await collect(gateway.answerStream({ ownerId: 'u1', q: 'oi' }));

      expect(events.map((e) => e.type)).toEqual(['sources', 'token', 'done']);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('yields a single safe error frame when the upstream call fails', async () => {
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }));
      const gateway = new HttpAnswerGateway('http://rag', 'tok');

      const events = await collect(gateway.answerStream({ ownerId: 'u1', q: 'oi' }));

      expect(events).toEqual([{ type: 'error', message: expect.any(String) }]);
    });

    it('skips a malformed frame mid-stream instead of killing the whole stream', async () => {
      const withGarbage =
        'data: {"type":"token","text":"oi"}\n\n' +
        'data: {"type":"token", BROKEN JSON\n\n' + // frame malformado
        'data: {"type":"token","text":" mundo"}\n\n' +
        'data: {"type":"done","grounded":true}\n\n';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(withGarbage, { status: 200 }));
      const gateway = new HttpAnswerGateway('http://rag', 'tok');

      const events = await collect(gateway.answerStream({ ownerId: 'u1', q: 'oi' }));

      // os tokens antes E depois do frame ruim chegam; o ruim é pulado.
      expect(events.map((e) => e.type)).toEqual(['token', 'token', 'done']);
      expect(
        events
          .filter((e) => e.type === 'token')
          .map((e) => (e as { text: string }).text)
          .join(''),
      ).toBe('oi mundo');
    });

    it('delivers a final frame that lacks the trailing blank line', async () => {
      const noTrailer =
        'data: {"type":"token","text":"fim"}\n\ndata: {"type":"done","grounded":false}'; // sem \n\n final
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(noTrailer, { status: 200 }));
      const gateway = new HttpAnswerGateway('http://rag', 'tok');

      const events = await collect(gateway.answerStream({ ownerId: 'u1', q: 'oi' }));

      expect(events.map((e) => e.type)).toEqual(['token', 'done']); // o done final não se perde
    });

    it('remaps the Python error frame to a safe message and passes status.position', async () => {
      const sse =
        'data: {"type":"status","stage":"queued","position":2}\n\n' +
        'data: {"type":"error","message":"detalhe interno do servidor"}\n\n';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(sse, { status: 200 }));
      const gateway = new HttpAnswerGateway('http://rag', 'tok');

      const events = await collect(gateway.answerStream({ ownerId: 'u1', q: 'oi' }));

      expect(events[0]).toEqual({ type: 'status', stage: 'queued', position: 2 });
      const err = events.find((e) => e.type === 'error') as { message: string };
      expect(err.message).not.toContain('interno'); // mensagem fixa, sem vazar detalhe
    });
  });
});
