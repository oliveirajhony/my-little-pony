import type { Document } from '../domain/document.js';
import {
  CreateDocument,
  DeleteDocument,
  GenerateDocumentPdf,
  GetDocument,
  GetDocumentPdf,
  GetPublicDocument,
  MarkDocumentIndexed,
  PublishDocument,
  SaveDraft,
  SendDocumentPdfEmail,
  UnpublishDocument,
} from './document-use-cases.js';
import type {
  CacheStore,
  Clock,
  DocumentPage,
  DocumentPdfStorage,
  DocumentQuery,
  DocumentRepository,
  EventPublisher,
  IdGenerator,
  PdfRenderer,
} from './ports.js';

class FakeCache implements CacheStore {
  store = new Map<string, unknown>();
  hits = 0;
  async get<T>(key: string): Promise<T | null> {
    const v = this.store.get(key);
    if (v !== undefined) this.hits += 1;
    return (v as T) ?? null;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

const clock: Clock = { now: () => new Date('2026-07-05T00:00:00.000Z') };
let seq = 0;
const ids: IdGenerator = { next: () => `d${++seq}` };

function makeEvents() {
  const published: string[] = [];
  const pdfRequested: string[] = [];
  const emailRequested: string[] = [];
  const events: EventPublisher = {
    documentIndexRequested: async (e) => {
      published.push(e.documentId);
    },
    documentPdfRequested: async (e) => {
      pdfRequested.push(e.documentId);
    },
    documentPdfEmailRequested: async (e) => {
      emailRequested.push(e.recipient);
    },
  };
  return { events, published, pdfRequested, emailRequested };
}

class FakeDocs implements DocumentRepository {
  byId = new Map<string, Document>();
  async save(doc: Document) {
    this.byId.set(doc.id, doc);
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async delete(id: string) {
    this.byId.delete(id);
  }
  async list(_query: DocumentQuery): Promise<DocumentPage> {
    return { items: [...this.byId.values()], total: this.byId.size };
  }
  async findPublishedBySlug(ownerId: string, slug: string) {
    for (const d of this.byId.values()) {
      if (d.status === 'published' && d.isOwnedBy(ownerId) && d.slug === slug) return d;
    }
    return null;
  }
}

describe('document use cases', () => {
  it('creates a draft owned by the caller', async () => {
    const repo = new FakeDocs();
    const doc = await new CreateDocument(repo, ids, clock).execute({
      ownerId: 'u1',
      title: 'Roadmap Q3',
    });
    expect(doc.ownerId).toBe('u1');
    expect(await repo.findById(doc.id)).not.toBeNull();
  });

  it('autosaves with the expected version and bumps it', async () => {
    const repo = new FakeDocs();
    const doc = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1' });
    const saved = await new SaveDraft(repo, clock).execute({
      id: doc.id,
      ownerId: 'u1',
      expectedVersion: 0,
      content: '<p>oi</p>',
    });
    expect(saved.version).toBe(1);
    expect(saved.excerpt).toBe('oi');
  });

  it('rejects a stale autosave', async () => {
    const repo = new FakeDocs();
    const doc = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1' });
    await expect(
      new SaveDraft(repo, clock).execute({ id: doc.id, ownerId: 'u1', expectedVersion: 5 }),
    ).rejects.toThrow(/stale-version/);
  });

  it('forbids access to another user document', async () => {
    const repo = new FakeDocs();
    const doc = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1' });
    await expect(
      new GetDocument(repo).execute({ id: doc.id, ownerId: 'intruder' }),
    ).rejects.toThrow(/forbidden/);
  });

  it('404s a missing document', async () => {
    await expect(
      new GetDocument(new FakeDocs()).execute({ id: 'ghost', ownerId: 'u1' }),
    ).rejects.toThrow(/document-not-found/);
  });

  it('deletes an owned document', async () => {
    const repo = new FakeDocs();
    const doc = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1' });
    await new DeleteDocument(repo).execute({ id: doc.id, ownerId: 'u1' });
    expect(await repo.findById(doc.id)).toBeNull();
  });

  it('appends a suffix when the same author reuses a published slug', async () => {
    const repo = new FakeDocs();
    const a = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1', title: 'Guia' });
    const b = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1', title: 'Guia' });
    const publishedA = await new PublishDocument(repo, clock, makeEvents().events).execute({
      id: a.id,
      ownerId: 'u1',
    });
    const publishedB = await new PublishDocument(repo, clock, makeEvents().events).execute({
      id: b.id,
      ownerId: 'u1',
    });
    expect(publishedA.slug).toBe('guia');
    expect(publishedB.slug).toBe('guia-2');
  });

  it('lets different authors keep the same slug (per-user namespace)', async () => {
    const repo = new FakeDocs();
    const a = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1', title: 'Guia' });
    const b = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u2', title: 'Guia' });
    const publishedA = await new PublishDocument(repo, clock, makeEvents().events).execute({
      id: a.id,
      ownerId: 'u1',
    });
    const publishedB = await new PublishDocument(repo, clock, makeEvents().events).execute({
      id: b.id,
      ownerId: 'u2',
    });
    expect(publishedA.slug).toBe('guia');
    expect(publishedB.slug).toBe('guia');
  });

  it('unpublishes back to draft', async () => {
    const repo = new FakeDocs();
    const doc = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1' });
    await new PublishDocument(repo, clock, makeEvents().events).execute({
      id: doc.id,
      ownerId: 'u1',
    });
    const back = await new UnpublishDocument(repo, clock).execute({ id: doc.id, ownerId: 'u1' });
    expect(back.status).toBe('draft');
  });
  it('emits an index-requested event on publish', async () => {
    const repo = new FakeDocs();
    const { events, published } = makeEvents();
    const doc = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1' });
    await new PublishDocument(repo, clock, events).execute({ id: doc.id, ownerId: 'u1' });
    expect(published).toEqual([doc.id]);
  });

  it('applies an indexing result via MarkDocumentIndexed', async () => {
    const repo = new FakeDocs();
    const doc = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1' });
    await new MarkDocumentIndexed(repo, clock).execute({ documentId: doc.id, status: 'ready' });
    expect((await repo.findById(doc.id))?.indexStatus).toBe('ready');
  });

  it('ignores an indexing result for a missing document', async () => {
    const repo = new FakeDocs();
    await expect(
      new MarkDocumentIndexed(repo, clock).execute({ documentId: 'ghost', status: 'ready' }),
    ).resolves.toBeUndefined();
  });
  it('serves a published document publicly and caches it', async () => {
    const repo = new FakeDocs();
    const cache = new FakeCache();
    const doc = await new CreateDocument(repo, ids, clock).execute({
      ownerId: 'u1',
      title: 'Publico',
    });
    await new PublishDocument(repo, clock, makeEvents().events).execute({
      id: doc.id,
      ownerId: 'u1',
    });
    const first = await new GetPublicDocument(repo, cache, 60).execute('u1', 'publico');
    expect(first.title).toBe('Publico');
    // second call hits the cache
    await new GetPublicDocument(repo, cache, 60).execute('u1', 'publico');
    expect(cache.hits).toBe(1);
  });

  it('404s a draft or unknown slug publicly', async () => {
    const repo = new FakeDocs();
    const cache = new FakeCache();
    await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1', title: 'Rascunho' });
    await expect(new GetPublicDocument(repo, cache, 60).execute('u1', 'rascunho')).rejects.toThrow(
      /document-not-found/,
    );
  });

  it('requests a PDF on publish', async () => {
    const repo = new FakeDocs();
    const doc = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1', title: 'Doc' });
    const { events, pdfRequested } = makeEvents();
    await new PublishDocument(repo, clock, events).execute({ id: doc.id, ownerId: 'u1' });
    expect(pdfRequested).toEqual([doc.id]);
  });

  it('sends the PDF download link by e-mail', async () => {
    const sent: { to: string; subject: string; html: string }[] = [];
    const mailer = {
      send: async (m: { to: string; subject: string; html: string }) => {
        sent.push(m);
      },
    };
    await new SendDocumentPdfEmail(mailer).execute({
      recipient: 'leitor@exemplo.com',
      title: 'Relatório',
      downloadUrl: 'http://localhost:3334/public/documents/u1/relatorio/pdf',
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('leitor@exemplo.com');
    expect(sent[0].html).toContain('/public/documents/u1/relatorio/pdf');
  });

  it('generates the PDF for a published doc and serves it by owner + slug', async () => {
    const repo = new FakeDocs();
    const pdfStore = new Map<string, Uint8Array>();
    const storage: DocumentPdfStorage = {
      put: async ({ ownerId, documentId, data }) => {
        pdfStore.set(`${ownerId}:${documentId}`, data);
      },
      get: async ({ ownerId, documentId }) => pdfStore.get(`${ownerId}:${documentId}`) ?? null,
      remove: async ({ ownerId, documentId }) => {
        pdfStore.delete(`${ownerId}:${documentId}`);
      },
    };
    const renderer: PdfRenderer = { render: async () => new Uint8Array([37, 80, 68, 70]) };

    const doc = await new CreateDocument(repo, ids, clock).execute({
      ownerId: 'u1',
      title: 'Publico',
    });
    // Draft → generation is skipped, nothing is stored.
    await new GenerateDocumentPdf(repo, renderer, storage).execute({ documentId: doc.id });
    expect(pdfStore.size).toBe(0);

    await new PublishDocument(repo, clock, makeEvents().events).execute({
      id: doc.id,
      ownerId: 'u1',
    });
    // Published but not generated yet → download returns null.
    expect(await new GetDocumentPdf(repo, storage).execute('u1', 'publico')).toBeNull();

    await new GenerateDocumentPdf(repo, renderer, storage).execute({ documentId: doc.id });
    const pdf = await new GetDocumentPdf(repo, storage).execute('u1', 'publico');
    expect(pdf?.title).toBe('Publico');
    expect(pdf?.data).toEqual(new Uint8Array([37, 80, 68, 70]));
  });
});
