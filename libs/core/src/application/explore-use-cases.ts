import type {
  AnswerGateway,
  DocumentRepository,
  SearchHit,
  SourceFileRepository,
} from './ports.js';
import type { SearchResultItem } from './search-use-cases.js';

/** Resposta do Explorar: prosa gerada por IA + fontes já enriquecidas. */
export type ExploreAnswer = {
  answer: string;
  grounded: boolean;
  sources: SearchResultItem[];
};

/**
 * RAG generativo sobre as fontes do dono. Delega recuperação + geração ao
 * serviço Python (/answer) e enriquece cada fonte com o metadado do dono
 * (título do documento ou nome do arquivo), descartando fontes não possuídas.
 */
export class AnswerQuestion {
  constructor(
    private readonly gateway: AnswerGateway,
    private readonly documents: DocumentRepository,
    private readonly files: SourceFileRepository,
  ) {}

  async execute(input: { ownerId: string; q: string }): Promise<ExploreAnswer> {
    const query = input.q.trim();
    if (!query) return { answer: '', grounded: false, sources: [] };

    const result = await this.gateway.answer({ ownerId: input.ownerId, q: query });
    const sources: SearchResultItem[] = [];
    for (const hit of result.sources) {
      const enriched = await this.enrich(hit, input.ownerId);
      if (enriched) sources.push(enriched);
    }
    return { answer: result.answer, grounded: result.grounded, sources };
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

function base(hit: SearchHit, kind: 'native' | 'file'): Omit<SearchResultItem, 'title' | 'slug'> {
  return { documentId: hit.documentId, score: hit.score, snippet: hit.snippet, kind };
}
