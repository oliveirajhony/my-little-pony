import { Document, type IndexStatus } from '../domain/document.js';
import { DomainError } from '../domain/errors.js';
import type {
  CacheStore,
  Clock,
  DocumentPage,
  DocumentPdfStorage,
  DocumentQuery,
  DocumentRepository,
  EmailSender,
  EventPublisher,
  IdGenerator,
  PdfRenderer,
} from './ports.js';

export type PublicDocument = {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  categories: string[];
  publishedAt: string | null;
  updatedAt: string;
};

/** Cache key for a published document, scoped by owner + slug. */
export function publicDocumentKey(ownerId: string, slug: string): string {
  return `public:doc:${ownerId}:${slug}`;
}

function toPublic(doc: Document): PublicDocument {
  return {
    title: doc.title,
    slug: doc.slug,
    content: doc.content,
    excerpt: doc.excerpt,
    categories: doc.categories,
    publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

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
    // Ask the PDF pipeline to (re)generate the downloadable file.
    await this.events.documentPdfRequested({ documentId: doc.id, ownerId: doc.ownerId });
    return doc;
  }

  // Only published documents share the slug namespace; append -2, -3… on clash.
  private async ensureUniqueSlug(doc: Document): Promise<void> {
    const base = doc.slug;
    let candidate = base;
    let suffix = 1;
    let existing = await this.repo.findPublishedBySlug(doc.ownerId, candidate);
    while (existing && existing.id !== doc.id) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
      existing = await this.repo.findPublishedBySlug(doc.ownerId, candidate);
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
 * Public read of a published document by slug, cached (read-through). Drafts and
 * unknown slugs are 404. Invalidation on publish/unpublish is done by callers.
 */
export class GetPublicDocument {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly cache: CacheStore,
    private readonly ttlSeconds: number,
  ) {}

  async execute(ownerId: string, slug: string): Promise<PublicDocument> {
    const key = publicDocumentKey(ownerId, slug);
    const cached = await this.cache.get<PublicDocument>(key);
    if (cached) return cached;

    const doc = await this.repo.findPublishedBySlug(ownerId, slug);
    if (!doc) throw new DomainError('document-not-found');

    const view = toPublic(doc);
    await this.cache.set(key, view, this.ttlSeconds);
    return view;
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

/**
 * Renders a published document to PDF and stores it (queue-driven). System-level:
 * no owner check. Drafts and documents removed meanwhile are skipped.
 */
export class GenerateDocumentPdf {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly renderer: PdfRenderer,
    private readonly storage: DocumentPdfStorage,
  ) {}

  async execute(input: { documentId: string }): Promise<void> {
    const doc = await this.repo.findById(input.documentId);
    if (doc?.status !== 'published') return;
    const data = await this.renderer.render({ title: doc.title, contentHtml: doc.content });
    await this.storage.put({ ownerId: doc.ownerId, documentId: doc.id, data });
  }
}

/**
 * Public read of a published document's PDF by owner + slug. Returns null when
 * the document isn't published or the PDF hasn't been generated yet.
 */
export class GetDocumentPdf {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly storage: DocumentPdfStorage,
  ) {}

  async execute(
    ownerId: string,
    slug: string,
  ): Promise<{ title: string; data: Uint8Array } | null> {
    const doc = await this.repo.findPublishedBySlug(ownerId, slug);
    if (!doc) return null;
    const data = await this.storage.get({ ownerId, documentId: doc.id });
    if (!data) return null;
    return { title: doc.title, data };
  }
}

function pdfEmailHtml(title: string, downloadUrl: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5">
  <p>Você pediu uma cópia do documento <strong>${title}</strong>.</p>
  <p><a href="${downloadUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Baixar o PDF</a></p>
  <p style="color:#6b7280;font-size:13px">Ou copie o link: ${downloadUrl}</p>
</div>`;
}

/** Envia por e-mail o link de download do PDF de um documento publicado. */
export class SendDocumentPdfEmail {
  constructor(private readonly mailer: EmailSender) {}

  async execute(input: { recipient: string; title: string; downloadUrl: string }): Promise<void> {
    await this.mailer.send({
      to: input.recipient,
      subject: `Seu documento: ${input.title}`,
      html: pdfEmailHtml(input.title, input.downloadUrl),
      text: `Baixe "${input.title}" em: ${input.downloadUrl}`,
    });
  }
}
