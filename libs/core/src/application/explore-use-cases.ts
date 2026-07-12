import type {
  AnswerGateway,
  DocumentRepository,
  LlmConfig,
  SourceFileRepository,
} from './ports.js';
import type { SearchResultItem } from './search-use-cases.js';
import { enrichSources } from './source-enricher.js';

/** Resposta do Explorar: prosa gerada por IA + fontes já enriquecidas. */
export type ExploreAnswer = {
  answer: string;
  grounded: boolean;
  sources: SearchResultItem[];
};

/**
 * Evento do streaming do Explorar, já enriquecido: `sources` carrega
 * `SearchResultItem[]` (título/slug + não-donos descartados). Os demais eventos
 * passam inalterados do gateway.
 */
export type ExploreStreamEvent =
  | { type: 'status'; stage: 'queued' | 'retrieving' | 'generating'; position?: number }
  | { type: 'sources'; grounded: boolean; sources: SearchResultItem[] }
  | { type: 'token'; text: string }
  | { type: 'done'; grounded: boolean }
  | { type: 'error'; message: string };

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

  async execute(input: { ownerId: string; q: string; llm?: LlmConfig }): Promise<ExploreAnswer> {
    const query = input.q.trim();
    if (!query) return { answer: '', grounded: false, sources: [] };

    const result = await this.gateway.answer({ ownerId: input.ownerId, q: query, llm: input.llm });
    const sources = await enrichSources(result.sources, input.ownerId, {
      documents: this.documents,
      files: this.files,
    });
    return { answer: result.answer, grounded: result.grounded, sources };
  }

  /**
   * Streaming: passa PELO core (não é proxy de bytes) justamente para enriquecer
   * o evento `sources` e **descartar não-donos** — a re-checagem de tenancy que o
   * Python não pode fazer. Os `token`s seguem inalterados.
   */
  async *stream(input: {
    ownerId: string;
    q: string;
    signal?: AbortSignal;
    llm?: LlmConfig;
  }): AsyncIterable<ExploreStreamEvent> {
    const query = input.q.trim();
    if (!query) {
      yield { type: 'done', grounded: false };
      return;
    }
    for await (const ev of this.gateway.answerStream({
      ownerId: input.ownerId,
      q: query,
      signal: input.signal,
      llm: input.llm,
    })) {
      if (ev.type === 'sources') {
        const sources = await enrichSources(ev.sources, input.ownerId, {
          documents: this.documents,
          files: this.files,
        });
        yield { type: 'sources', grounded: ev.grounded, sources };
      } else {
        yield ev;
      }
    }
  }
}
