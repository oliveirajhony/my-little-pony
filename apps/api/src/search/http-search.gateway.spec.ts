import { Logger } from '@nestjs/common';
import { HttpSearchGateway } from './http-search.gateway';

const HITS = [{ documentId: 'd1', score: 0.5, snippet: 's', kind: 'file' }];

describe('HttpSearchGateway', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns no results without calling fetch when url is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const gateway = new HttpSearchGateway('', 'tok');

    expect(await gateway.search({ ownerId: 'u1', q: 'oi' })).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps hits and normalizes kind on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(HITS), { status: 200 }),
    );
    const gateway = new HttpSearchGateway('http://rag', 'tok');

    const hits = await gateway.search({ ownerId: 'u1', q: 'oi' });

    expect(hits).toEqual([{ documentId: 'd1', score: 0.5, snippet: 's', kind: 'file' }]);
  });

  it('sends a timeout AbortSignal', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(HITS), { status: 200 }));
    const gateway = new HttpSearchGateway('http://rag', 'tok', 999);

    await gateway.search({ ownerId: 'u1', q: 'oi' });

    expect(fetchSpy.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('logs an error and returns [] when the configured service fails', async () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 503 }));
    const gateway = new HttpSearchGateway('http://rag', 'tok');

    expect(await gateway.search({ ownerId: 'u1', q: 'oi' })).toEqual([]);
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});
