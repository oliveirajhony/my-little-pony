import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ExploreStreamEvent } from './explore-api';

/**
 * E2e REAL do caminho de streaming do web sobre sockets de verdade: um servidor
 * HTTP emite o SSE do /explore/stream (com delays entre tokens) e
 * `askExploreStream` (→ apiFetchStream → parseSseStream) consome via rede.
 * Prova: tokens chegam INCREMENTALMENTE (não bufferizados) e o parser lida com a
 * quebra real de chunks TCP.
 */

const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('e2e: askExploreStream over real sockets (web side)', () => {
  let server: Server;
  let askExploreStream: (q: string, signal?: AbortSignal) => AsyncIterable<ExploreStreamEvent>;

  beforeAll(async () => {
    server = createServer(async (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      res.write(': keep-alive\n\n'); // heartbeat — o parser deve ignorar
      res.write(sse({ type: 'status', stage: 'retrieving' }));
      res.write(
        sse({
          type: 'sources',
          grounded: true,
          sources: [
            { documentId: 'd1', score: 1, snippet: 's', kind: 'native', title: 'Doc', slug: 'doc' },
          ],
        }),
      );
      for (const t of ['Oi', ', ', 'café']) {
        await sleep(40);
        res.write(sse({ type: 'token', text: t }));
      }
      res.write(sse({ type: 'done', grounded: true }));
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    // API_BASE é lido no import do api-client → seta o env ANTES do import dinâmico.
    process.env.NEXT_PUBLIC_API_URL = `http://127.0.0.1:${port}`;
    ({ askExploreStream } = await import('./explore-api'));
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('streams events incrementally and reconstructs the answer', async () => {
    const timeline: Array<{ ev: ExploreStreamEvent; at: number }> = [];
    const start = Date.now();
    for await (const ev of askExploreStream('café')) {
      timeline.push({ ev, at: Date.now() - start });
    }
    const events = timeline.map((t) => t.ev);

    expect(events.map((e) => e.type)).toEqual([
      'status',
      'sources',
      'token',
      'token',
      'token',
      'done',
    ]);
    const text = events
      .filter((e): e is Extract<ExploreStreamEvent, { type: 'token' }> => e.type === 'token')
      .map((e) => e.text)
      .join('');
    expect(text).toBe('Oi, café'); // UTF-8 + chunks reais preservados

    // Prova de streaming: 3 tokens × ~40ms chegaram espalhados, não de uma vez.
    const tks = timeline.filter((t) => t.ev.type === 'token').map((t) => t.at);
    expect(tks[tks.length - 1] - tks[0]).toBeGreaterThanOrEqual(50);
  });

  it('aborts cleanly mid-stream', async () => {
    const ctrl = new AbortController();
    const seen: string[] = [];
    const run = (async () => {
      for await (const ev of askExploreStream('café', ctrl.signal)) {
        seen.push(ev.type);
        if (ev.type === 'sources') ctrl.abort(); // aborta assim que as fontes chegam
      }
    })();
    await expect(run).resolves.toBeUndefined();
    expect(seen).toContain('sources');
    expect(seen).not.toContain('done'); // encerrou antes do fim
  });
});
