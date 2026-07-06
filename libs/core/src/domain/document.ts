import {
  clonePageConfig,
  DEFAULT_PAGE_CONFIG,
  mergePageConfig,
  type PageConfig,
  type PageConfigPatch,
} from './page-config.js';

export type DocumentStatus = 'draft' | 'published';
export type IndexStatus = 'none' | 'indexing' | 'ready' | 'failed';

export type DocumentProps = {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  status: DocumentStatus;
  content: string;
  excerpt: string;
  categories: string[];
  indexStatus: IndexStatus;
  version: number;
  pageConfig: PageConfig;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const EXCERPT_LENGTH = 180;
const DEFAULT_TITLE = 'Documento sem título';

/**
 * Document aggregate. Owns slug generation, excerpt derivation, the edit/version
 * cycle (autosave) and the publish/unpublish transitions. Framework-free.
 */
export class Document {
  private constructor(private props: DocumentProps) {}

  static slugify(value: string): string {
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 60);
    return slug || 'documento';
  }

  static stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static makeExcerpt(html: string): string {
    const clean = Document.stripHtml(html);
    if (clean.length === 0) return 'Documento em branco.';
    if (clean.length <= EXCERPT_LENGTH) return clean;
    return `${clean.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
  }

  static fromProps(props: DocumentProps): Document {
    return new Document(props);
  }

  /** New empty draft owned by a user. */
  static create(input: { id: string; ownerId: string; title?: string; now: Date }): Document {
    const title = input.title?.trim() || DEFAULT_TITLE;
    return new Document({
      id: input.id,
      ownerId: input.ownerId,
      title,
      slug: Document.slugify(title),
      status: 'draft',
      content: '',
      excerpt: Document.makeExcerpt(''),
      categories: [],
      indexStatus: 'none',
      version: 0,
      pageConfig: clonePageConfig(DEFAULT_PAGE_CONFIG),
      publishedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  /** Applies an autosave edit and bumps the version. */
  applyEdit(
    input: {
      title?: string;
      content?: string;
      slug?: string;
      categories?: string[];
      pageConfig?: PageConfigPatch;
    },
    now: Date,
  ): void {
    if (input.title !== undefined) this.props.title = input.title.trim() || DEFAULT_TITLE;
    if (input.content !== undefined) {
      this.props.content = input.content;
      this.props.excerpt = Document.makeExcerpt(input.content);
    }
    if (input.slug !== undefined) this.props.slug = Document.slugify(input.slug);
    if (input.categories !== undefined) this.props.categories = input.categories;
    if (input.pageConfig !== undefined) {
      this.props.pageConfig = mergePageConfig(this.props.pageConfig, input.pageConfig);
    }
    this.props.version += 1;
    this.props.updatedAt = now;
  }

  /** Overrides the slug (used to resolve a publish-time collision). */
  setSlug(slug: string, now: Date): void {
    this.props.slug = Document.slugify(slug);
    this.props.updatedAt = now;
  }

  publish(now: Date): void {
    this.props.status = 'published';
    this.props.publishedAt = this.props.publishedAt ?? now;
    this.props.indexStatus = 'indexing';
    this.props.updatedAt = now;
  }

  unpublish(now: Date): void {
    this.props.status = 'draft';
    this.props.indexStatus = 'none';
    this.props.updatedAt = now;
  }

  setIndexStatus(status: IndexStatus, now: Date): void {
    this.props.indexStatus = status;
    this.props.updatedAt = now;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.ownerId === userId;
  }

  get id(): string {
    return this.props.id;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get title(): string {
    return this.props.title;
  }
  get slug(): string {
    return this.props.slug;
  }
  get status(): DocumentStatus {
    return this.props.status;
  }
  get content(): string {
    return this.props.content;
  }
  get excerpt(): string {
    return this.props.excerpt;
  }
  get categories(): string[] {
    return this.props.categories;
  }
  get indexStatus(): IndexStatus {
    return this.props.indexStatus;
  }
  get version(): number {
    return this.props.version;
  }
  get pageConfig(): PageConfig {
    return clonePageConfig(this.props.pageConfig);
  }
  get publishedAt(): Date | null {
    return this.props.publishedAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): DocumentProps {
    return {
      ...this.props,
      categories: [...this.props.categories],
      pageConfig: clonePageConfig(this.props.pageConfig),
    };
  }
}
