import type {
  AnswerGateway,
  AnswerStreamEvent,
  GatewayAnswer,
  LlmConfig,
} from '@my-little-pony/core';
import { PythonServiceClient, parseSse } from '../http/python-service.client';

const NOT_CONFIGURED: GatewayAnswer = {
  answer: 'A busca inteligente ainda não está disponível.',
  grounded: false,
  sources: [],
};

// Mensagem fixa e segura para o cliente — nunca vaza detalhe interno.
const SAFE_STREAM_ERROR = 'Não consegui responder agora. Tente novamente em instantes.';

// Sem NENHUM byte do Python por esse tempo → encerra o stream (upstream travado
// não pode prender a conexão indefinidamente). Folgado o bastante para o LLM em
// CPU entre tokens.
const STREAM_IDLE_MS = 60_000;

type AnswerBody = {
  answer: string;
  grounded: boolean;
  sources: Array<{ documentId: string; score: number; snippet: string; kind?: string }>;
};

// Frames crus do SSE do Python (POST /answer/stream).
type RawFrame =
  | { type: 'status'; stage: 'queued' | 'retrieving' | 'generating'; position?: number }
  | {
      type: 'sources';
      grounded?: boolean;
      sources?: Array<{ documentId: string; score: number; snippet: string; kind?: string }>;
    }
  | { type: 'token'; text: string }
  | { type: 'done'; grounded?: boolean }
  | { type: 'error'; message?: string };

/**
 * AnswerGateway adapter proxying to the Python RAG service (/answer + /answer/stream).
 * Não configurado (SEARCH_SERVICE_URL vazio) degrada com uma resposta graciosa.
 * O streaming parseia o SSE e o core (AnswerQuestion.stream) enriquece as fontes.
 */
export class HttpAnswerGateway implements AnswerGateway {
  private readonly client: PythonServiceClient;

  constructor(serviceUrl: string, serviceToken: string, timeoutMs = 15_000) {
    this.client = new PythonServiceClient(serviceUrl, serviceToken, timeoutMs);
  }

  async answer(input: { ownerId: string; q: string; llm?: LlmConfig }): Promise<GatewayAnswer> {
    if (!this.client.configured) return NOT_CONFIGURED; // not deployed yet — expected
    try {
      const body = await this.client.postJson<AnswerBody>('/answer', {
        ownerId: input.ownerId,
        query: input.q,
        llm: input.llm,
      });
      return {
        answer: body.answer,
        grounded: body.grounded,
        sources: body.sources.map((s) => ({
          documentId: s.documentId,
          score: s.score,
          snippet: s.snippet,
          kind: s.kind === 'file' ? 'file' : 'native',
        })),
      };
    } catch {
      return NOT_CONFIGURED; // degrade gracefully — the client already logged
    }
  }

  async *answerStream(input: {
    ownerId: string;
    q: string;
    signal?: AbortSignal;
    llm?: LlmConfig;
  }): AsyncIterable<AnswerStreamEvent> {
    if (!this.client.configured) {
      // Degrada como uma resposta ungrounded (mesma UX do síncrono).
      yield { type: 'sources', grounded: false, sources: [] };
      yield { type: 'token', text: NOT_CONFIGURED.answer };
      yield { type: 'done', grounded: false };
      return;
    }

    let response: Response;
    try {
      response = await this.client.postStream(
        '/answer/stream',
        { ownerId: input.ownerId, query: input.q, llm: input.llm },
        input.signal,
      );
    } catch {
      yield { type: 'error', message: SAFE_STREAM_ERROR }; // client já logou
      return;
    }

    try {
      for await (const raw of parseSse<RawFrame>(response, STREAM_IDLE_MS)) {
        switch (raw.type) {
          case 'sources':
            yield {
              type: 'sources',
              grounded: Boolean(raw.grounded),
              sources: (raw.sources ?? []).map((s) => ({
                documentId: s.documentId,
                score: s.score,
                snippet: s.snippet,
                kind: s.kind === 'file' ? 'file' : 'native',
              })),
            };
            break;
          case 'status':
            yield { type: 'status', stage: raw.stage, position: raw.position };
            break;
          case 'token':
            yield { type: 'token', text: raw.text };
            break;
          case 'done':
            yield { type: 'done', grounded: Boolean(raw.grounded) };
            break;
          case 'error':
            yield { type: 'error', message: SAFE_STREAM_ERROR };
            break;
        }
      }
    } catch {
      // Abort por disconnect do cliente é esperado — encerra em silêncio.
      if (input.signal?.aborted) return;
      yield { type: 'error', message: SAFE_STREAM_ERROR };
    }
  }
}
