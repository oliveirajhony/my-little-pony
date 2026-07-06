import type { Document } from '@my-little-pony/core';
import { contentService } from '../content/content-service';

/** Compact list projection for an agent. */
export function documentSummary(doc: Document) {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    status: doc.status,
    excerpt: doc.excerpt,
    categories: doc.categories,
    version: doc.version,
    publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Full projection: content in both Markdown (for reasoning) and HTML, plus page config. */
export function documentDetail(doc: Document) {
  return {
    ...documentSummary(doc),
    pageConfig: doc.pageConfig,
    contentMarkdown: contentService.toMarkdown(doc.content),
    contentHtml: doc.content,
  };
}
