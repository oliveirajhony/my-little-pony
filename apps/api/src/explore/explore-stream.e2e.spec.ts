import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  AnswerQuestion,
  Document,
  type DocumentRepository,
  type ExploreStreamEvent,
  SourceFile,
  type SourceFileRepository,
} from '@my-little-pony/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpAnswerGateway } from './http-answer.gateway';

/**
 * End-to-end REAL do caminho de streaming do Nest (Fase B) sobre sockets de
 * verdade: um servidor HTTP emite o SSE no formato do serviço Python, com delays
 * entre os tokens, e o gateway + core consomem via rede. Prova: (1) os tokens
 * chegam INCREMENTALMENTE (não bufferizados até o fim), (2) as fontes são
 * enriquecidas com título/slug, (3) fontes de outro dono são descartadas.
 */

const now = new Date('2026-07-05T00:00:00.000Z');

function docRepo(docs: Document[]): DocumentRepository {
  const byId = new Map(docs.map((d) => [d.id, d]));
  return {
    findById: async (id) => byId.get(id) ?? null,
    save: async () => {},
    delete: async () => {},
    list: async () => ({ items: [], total: 0 }),
    findPublishedBySlug: async () => null,
  };
}
function fileRepo(files: SourceFile[]): SourceFileRepository {
  const byId = new Map(files.map((f) => [f.id, f]));
  return {
    findById: async (id) => byId.get(id) ?? null,
    save: async () => {},
    delete: async () => {},
    listByOwner: async () => [],
  };
}

const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('e2e: /explore streaming over real sockets (Nest side)', () => {
  let server: Server;
  let url: string;
  let received: Array<{ body: Record<string, unknown> }> = [];

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      received.push({ body: JSON.parse(raw || '{}') });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      });
      // Emite como o Python: status → sources (com d1 do dono E d2 de outro) →
      // generating → tokens (com delay, provando streaming) → done.
      res.write(sse({ type: 'status', stage: 'retrieving' }));
      res.write(
        sse({
          type: 'sources',
          grounded: true,
          sources: [
            { documentId: 'd1', chunkId: 'c1', score: 0.9, snippet: 'a', kind: 'native' },
            { documentId: 'd-other', chunkId: 'c2', score: 0.5, snippet: 'x', kind: 'native' },
            { documentId: 'f1', chunkId: 'c3', score: 0.7, snippet: 'b', kind: 'file' },
          ],
        }),
      );
      res.write(sse({ type: 'status', stage: 'generating' }));
      for (const t of ['Segundo', ' [1],', ' café']) {
        await sleep(40);
        res.write(sse({ type: 'token', text: t }));
      }
      res.write(sse({ type: 'done', grounded: true }));
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('streams tokens incrementally, enriches sources and drops non-owned', async () => {
    received = [];
    const doc = Document.create({ id: 'd1', ownerId: 'u1', title: 'Café', now });
    const other = Document.create({ id: 'd-other', ownerId: 'someone-else', title: 'X', now });
    const file = SourceFile.create({
      id: 'f1',
      ownerId: 'u1',
      filename: 'contrato.pdf',
      contentType: 'application/pdf',
      sizeBytes: 10,
      now,
    });
    const gateway = new HttpAnswerGateway(url, 'tok');
    const useCase = new AnswerQuestion(gateway, docRepo([doc, other]), fileRepo([file]));

    const timeline: Array<{ ev: ExploreStreamEvent; at: number }> = [];
    const start = Date.now();
    for await (const ev of useCase.stream({ ownerId: 'u1', q: 'café' })) {
      timeline.push({ ev, at: Date.now() - start });
    }
    const events = timeline.map((t) => t.ev);

    // Ordem completa preservada ponta a ponta.
    expect(events.map((e) => e.type)).toEqual([
      'status',
      'sources',
      'status',
      'token',
      'token',
      'token',
      'done',
    ]);

    // ownerId chegou ao "Python" via corpo (mas veio do JWT no controller real).
    expect(received[0].body).toMatchObject({ ownerId: 'u1', query: 'café' });

    // Fontes enriquecidas E a de outro dono (d-other) descartada.
    const sources = events.find((e) => e.type === 'sources') as {
      sources: Array<{ documentId: string; title: string; slug: string | null }>;
    };
    expect(sources.sources.map((s) => s.documentId)).toEqual(['d1', 'f1']);
    expect(sources.sources[0]).toMatchObject({ title: 'Café', slug: 'cafe' });
    expect(sources.sources[1]).toMatchObject({ title: 'contrato.pdf', slug: null });

    // Prova de streaming: o texto reconstruído bate...
    const text = events
      .filter((e) => e.type === 'token')
      .map((e) => (e as { text: string }).text)
      .join('');
    expect(text).toBe('Segundo [1], café');

    // ...e os tokens chegaram ESPALHADOS no tempo (3 tokens × ~40ms), não todos
    // de uma vez no fim — se fosse bufferizado, o span seria ~0.
    const tokenTimes = timeline.filter((t) => t.ev.type === 'token').map((t) => t.at);
    expect(tokenTimes[tokenTimes.length - 1] - tokenTimes[0]).toBeGreaterThanOrEqual(50);
  });
});
