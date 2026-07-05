import type { Document } from '@my-little-pony/core';

export type DocumentSummary = {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string;
  categories: string[];
  indexStatus: string;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type DocumentDetail = DocumentSummary & { content: string };

function toSummary(doc: Document): DocumentSummary {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    status: doc.status,
    excerpt: doc.excerpt,
    categories: doc.categories,
    indexStatus: doc.indexStatus,
    version: doc.version,
    publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** List/card projection — omits the heavy content field. */
export function toDocumentSummary(doc: Document): DocumentSummary {
  return toSummary(doc);
}

/** Editor projection — includes the full HTML content. */
export function toDocumentDetail(doc: Document): DocumentDetail {
  return { ...toSummary(doc), content: doc.content };
}
