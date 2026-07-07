import type { AnswerGateway, DocumentRepository, SourceFileRepository } from './ports.js';
import type { SearchResultItem } from './search-use-cases.js';
import { enrichSources } from './source-enricher.js';

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
    const sources = await enrichSources(result.sources, input.ownerId, {
      documents: this.documents,
      files: this.files,
    });
    return { answer: result.answer, grounded: result.grounded, sources };
  }
}
