import type { Document } from '../domain/document.js';
import {
  CreateDocument,
  DeleteDocument,
  GetDocument,
  PublishDocument,
  SaveDraft,
  UnpublishDocument,
} from './document-use-cases.js';
import type {
  Clock,
  DocumentPage,
  DocumentQuery,
  DocumentRepository,
  IdGenerator,
} from './ports.js';

const clock: Clock = { now: () => new Date('2026-07-05T00:00:00.000Z') };
let seq = 0;
const ids: IdGenerator = { next: () => `d${++seq}` };

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
    const publishedA = await new PublishDocument(repo, clock).execute({ id: a.id, ownerId: 'u1' });
    const publishedB = await new PublishDocument(repo, clock).execute({ id: b.id, ownerId: 'u2' });
    expect(publishedA.slug).toBe('guia');
    expect(publishedB.slug).toBe('guia-2');
  });

  it('unpublishes back to draft', async () => {
    const repo = new FakeDocs();
    const doc = await new CreateDocument(repo, ids, clock).execute({ ownerId: 'u1' });
    await new PublishDocument(repo, clock).execute({ id: doc.id, ownerId: 'u1' });
    const back = await new UnpublishDocument(repo, clock).execute({ id: doc.id, ownerId: 'u1' });
    expect(back.status).toBe('draft');
  });
});
