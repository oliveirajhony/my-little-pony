import type { Document } from '../domain/document.js';
import {
  CreateDocument,
  DeleteDocument,
  GetDocument,
  GetPublicDocument,
  MarkDocumentIndexed,
  PublishDocument,
  SaveDraft,
  UnpublishDocument,
} from './document-use-cases.js';
import type {
  CacheStore,
  Clock,
  DocumentPage,
  DocumentQuery,
  DocumentRepository,
  EventPublisher,
  IdGenerator,
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
  const events: EventPublisher = {
    documentIndexRequested: async (e) => {
      published.push(e.documentId);
    },
  };
  return { events, published };
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
  async findPublishedBySlug(slug: string) {
    for (const d of this.byId.values()) {
      if (d.status === 'published' && d.slug === slug) return d;
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

  it('publishes and appends a suffix on slug collision', async () => {
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
    expect(publishedB.slug).toBe('guia-2');
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
    const first = await new GetPublicDocument(repo, cache, 60).execute('publico');
    expect(first.title).toBe('Publico');
    // second call hits the cache
    await new GetPublicDocument(repo, cache, 60).execute('publico');
    expect(cache.hits).toBe(1);
  });

  it('404s a draft or unknown slug publicly', async () => {
    const repo = new FakeDocs();
    const cache = new FakeCache();
    await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1', title: 'Rascunho' });
    await expect(new GetPublicDocument(repo, cache, 60).execute('rascunho')).rejects.toThrow(
      /document-not-found/,
    );
  });
});
