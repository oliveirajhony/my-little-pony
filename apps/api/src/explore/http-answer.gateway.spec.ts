import { Logger } from '@nestjs/common';
import { HttpAnswerGateway } from './http-answer.gateway';

const OK_BODY = {
  answer: 'resposta [1]',
  grounded: true,
  sources: [{ documentId: 'd1', score: 0.9, snippet: 'a', kind: 'file' }],
};

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
});
