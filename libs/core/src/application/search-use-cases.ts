import type { DocumentRepository, SearchGateway, SearchHit } from './ports.js';

export type SearchResultItem = SearchHit & { title: string; slug: string };

/**
 * Semantic/hybrid search over document content. Delegates retrieval to the
 * search service (Python) and enriches each hit with the owner's document
 * metadata, dropping hits the caller does not own.
 */
export class SearchDocuments {
  constructor(
    private readonly gateway: SearchGateway,
    private readonly repo: DocumentRepository,
  ) {}

  async execute(input: { ownerId: string; q: string }): Promise<SearchResultItem[]> {
    const query = input.q.trim();
    if (!query) return [];

    const hits = await this.gateway.search({ ownerId: input.ownerId, q: query });
    const results: SearchResultItem[] = [];
    for (const hit of hits) {
      const doc = await this.repo.findById(hit.documentId);
      if (doc?.isOwnedBy(input.ownerId)) {
        results.push({ ...hit, title: doc.title, slug: doc.slug });
      }
    }
    return results;
  }
}
