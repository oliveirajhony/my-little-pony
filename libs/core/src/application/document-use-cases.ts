import { Document, type IndexStatus } from '../domain/document.js';
import { DomainError } from '../domain/errors.js';
import type {
  Clock,
  DocumentPage,
  DocumentQuery,
  DocumentRepository,
  EventPublisher,
  IdGenerator,
} from './ports.js';

/** Loads a document and asserts the caller owns it. */
async function loadOwned(repo: DocumentRepository, id: string, ownerId: string): Promise<Document> {
  const doc = await repo.findById(id);
  if (!doc) throw new DomainError('document-not-found');
  if (!doc.isOwnedBy(ownerId)) throw new DomainError('forbidden');
  return doc;
}

export class CreateDocument {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: { ownerId: string; title?: string }): Promise<Document> {
    const doc = Document.create({
      id: this.ids.next(),
      ownerId: input.ownerId,
      title: input.title,
      now: this.clock.now(),
    });
    await this.repo.save(doc);
    return doc;
  }
}

export class SaveDraft {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    id: string;
    ownerId: string;
    expectedVersion: number;
    title?: string;
    content?: string;
    slug?: string;
    categories?: string[];
  }): Promise<Document> {
    const doc = await loadOwned(this.repo, input.id, input.ownerId);
    // Optimistic concurrency: reject a save built on a stale version.
    if (doc.version !== input.expectedVersion) throw new DomainError('stale-version');
    doc.applyEdit(
      {
        title: input.title,
        content: input.content,
        slug: input.slug,
        categories: input.categories,
      },
      this.clock.now(),
    );
    await this.repo.save(doc);
    return doc;
  }
}

export class GetDocument {
  constructor(private readonly repo: DocumentRepository) {}

  execute(input: { id: string; ownerId: string }): Promise<Document> {
    return loadOwned(this.repo, input.id, input.ownerId);
  }
}

export class ListDocuments {
  constructor(private readonly repo: DocumentRepository) {}

  execute(query: DocumentQuery): Promise<DocumentPage> {
    return this.repo.list(query);
  }
}

export class DeleteDocument {
  constructor(private readonly repo: DocumentRepository) {}

  async execute(input: { id: string; ownerId: string }): Promise<void> {
    await loadOwned(this.repo, input.id, input.ownerId);
    await this.repo.delete(input.id);
  }
}

export class PublishDocument {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(input: { id: string; ownerId: string }): Promise<Document> {
    const doc = await loadOwned(this.repo, input.id, input.ownerId);
    await this.ensureUniqueSlug(doc);
    doc.publish(this.clock.now());
    await this.repo.save(doc);
    // Ask the indexing pipeline to (re)index this document.
    await this.events.documentIndexRequested({
      documentId: doc.id,
      ownerId: doc.ownerId,
      version: doc.version,
    });
    return doc;
  }

  // Only published documents share the slug namespace; append -2, -3… on clash.
  private async ensureUniqueSlug(doc: Document): Promise<void> {
    const base = doc.slug;
    let candidate = base;
    let suffix = 1;
    let existing = await this.repo.findPublishedBySlug(candidate);
    while (existing && existing.id !== doc.id) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
      existing = await this.repo.findPublishedBySlug(candidate);
    }
    if (candidate !== base) doc.setSlug(candidate, this.clock.now());
  }
}

export class UnpublishDocument {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: { id: string; ownerId: string }): Promise<Document> {
    const doc = await loadOwned(this.repo, input.id, input.ownerId);
    doc.unpublish(this.clock.now());
    await this.repo.save(doc);
    return doc;
  }
}

/**
 * Applies the indexing pipeline's result (from the queue). System-level: no
 * owner check. A document deleted meanwhile is silently ignored.
 */
export class MarkDocumentIndexed {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: { documentId: string; status: IndexStatus }): Promise<void> {
    const doc = await this.repo.findById(input.documentId);
    if (!doc) return;
    doc.setIndexStatus(input.status, this.clock.now());
    await this.repo.save(doc);
  }
}
