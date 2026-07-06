import type {
  DocumentRepository,
  SearchGateway,
  SearchHit,
  SourceFileRepository,
  SourceKind,
} from './ports.js';

/**
 * Um resultado de busca já enriquecido com metadados da fonte do dono.
 * `slug` só existe para documentos nativos (arquivos abrem pelo id).
 */
export type SearchResultItem = {
  documentId: string;
  score: number;
  snippet: string;
  kind: SourceKind;
  title: string;
  slug: string | null;
};

/**
 * Semantic/hybrid search over the owner's indexable sources. Delegates
 * retrieval to the search service (Python) and enriches each hit with the
 * owner's document/file metadata, dropping hits the caller does not own.
 */
export class SearchDocuments {
  constructor(
    private readonly gateway: SearchGateway,
    private readonly documents: DocumentRepository,
    private readonly files: SourceFileRepository,
  ) {}

  async execute(input: { ownerId: string; q: string }): Promise<SearchResultItem[]> {
    const query = input.q.trim();
    if (!query) return [];

    const hits = await this.gateway.search({ ownerId: input.ownerId, q: query });
    const results: SearchResultItem[] = [];
    for (const hit of hits) {
      const enriched = await this.enrich(hit, input.ownerId);
      if (enriched) results.push(enriched);
    }
    return results;
  }

  private async enrich(hit: SearchHit, ownerId: string): Promise<SearchResultItem | null> {
    if (hit.kind === 'file') {
      const file = await this.files.findById(hit.documentId);
      if (!file?.isOwnedBy(ownerId)) return null;
      return { ...base(hit, 'file'), title: file.filename, slug: null };
    }
    const doc = await this.documents.findById(hit.documentId);
    if (!doc?.isOwnedBy(ownerId)) return null;
    return { ...base(hit, 'native'), title: doc.title, slug: doc.slug };
  }
}

function base(hit: SearchHit, kind: SourceKind): Omit<SearchResultItem, 'title' | 'slug'> {
  return { documentId: hit.documentId, score: hit.score, snippet: hit.snippet, kind };
}
