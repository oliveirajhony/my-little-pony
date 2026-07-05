import {
  Document,
  type DocumentPage,
  type DocumentQuery,
  type DocumentRepository,
} from '@my-little-pony/core';
import type { Repository } from 'typeorm';
import { DocumentOrmEntity } from './document.orm-entity';

const FTS_LANG = 'portuguese';

/** DocumentRepository port backed by TypeORM + Postgres full-text search. */
export class TypeOrmDocumentRepository implements DocumentRepository {
  constructor(private readonly repo: Repository<DocumentOrmEntity>) {}

  async save(document: Document): Promise<void> {
    await this.repo.save(this.toOrm(document));
  }

  async findById(id: string): Promise<Document | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async findPublishedBySlug(ownerId: string, slug: string): Promise<Document | null> {
    const row = await this.repo.findOne({ where: { ownerId, slug, status: 'published' } });
    return row ? this.toDomain(row) : null;
  }

  async list(query: DocumentQuery): Promise<DocumentPage> {
    const qb = this.repo
      .createQueryBuilder('d')
      .where('d.owner_id = :ownerId', { ownerId: query.ownerId });

    if (query.status) qb.andWhere('d.status = :status', { status: query.status });
    if (query.category) qb.andWhere(':category = ANY(d.categories)', { category: query.category });
    const q = query.q?.trim();
    if (q) {
      qb.andWhere('d.search_tsv @@ plainto_tsquery(:lang, :q)', { lang: FTS_LANG, q });
    }

    qb.orderBy('d.updated_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map((row) => this.toDomain(row)), total };
  }

  private toDomain(row: DocumentOrmEntity): Document {
    return Document.fromProps({
      id: row.id,
      ownerId: row.ownerId,
      title: row.title,
      slug: row.slug,
      status: row.status as Document['status'],
      content: row.content,
      excerpt: row.excerpt,
      categories: row.categories,
      indexStatus: row.indexStatus as ReturnType<Document['toProps']>['indexStatus'],
      version: row.version,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toOrm(document: Document): DocumentOrmEntity {
    const props = document.toProps();
    const row = new DocumentOrmEntity();
    row.id = props.id;
    row.ownerId = props.ownerId;
    row.title = props.title;
    row.slug = props.slug;
    row.status = props.status;
    row.content = props.content;
    row.excerpt = props.excerpt;
    row.categories = props.categories;
    row.indexStatus = props.indexStatus;
    row.version = props.version;
    row.storageKey = null;
    row.publishedAt = props.publishedAt;
    row.createdAt = props.createdAt;
    row.updatedAt = props.updatedAt;
    return row;
  }
}
