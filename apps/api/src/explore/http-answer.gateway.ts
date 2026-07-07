import type { AnswerGateway, GatewayAnswer } from '@my-little-pony/core';
import { PythonServiceClient } from '../http/python-service.client';

const NOT_CONFIGURED: GatewayAnswer = {
  answer: 'A busca inteligente ainda não está disponível.',
  grounded: false,
  sources: [],
};

type AnswerBody = {
  answer: string;
  grounded: boolean;
  sources: Array<{ documentId: string; score: number; snippet: string; kind?: string }>;
};

/**
 * AnswerGateway adapter proxying to the Python RAG service (/answer). Until that
 * service is deployed (SEARCH_SERVICE_URL empty) it returns a graceful
 * not-configured answer. A configured-but-failing service is logged by the
 * client, not disguised as a cheerful "not available" answer.
 */
export class HttpAnswerGateway implements AnswerGateway {
  private readonly client: PythonServiceClient;

  constructor(serviceUrl: string, serviceToken: string, timeoutMs = 15_000) {
    this.client = new PythonServiceClient(serviceUrl, serviceToken, timeoutMs);
  }

  async answer(input: { ownerId: string; q: string }): Promise<GatewayAnswer> {
    if (!this.client.configured) return NOT_CONFIGURED; // not deployed yet — expected
    try {
      const body = await this.client.postJson<AnswerBody>('/answer', {
        ownerId: input.ownerId,
        query: input.q,
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
}
