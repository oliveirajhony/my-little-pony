import type {
  DocumentRepository,
  SearchGateway,
  SourceFileRepository,
  SourceKind,
} from './ports.js';
import { enrichSources } from './source-enricher.js';

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
    return enrichSources(hits, input.ownerId, { documents: this.documents, files: this.files });
  }
}
