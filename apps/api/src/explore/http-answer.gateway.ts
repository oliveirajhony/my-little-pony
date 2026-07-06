import type { AnswerGateway, GatewayAnswer } from '@my-little-pony/core';
import { Logger } from '@nestjs/common';

const NOT_CONFIGURED: GatewayAnswer = {
  answer: 'A busca inteligente ainda não está disponível.',
  grounded: false,
  sources: [],
};

/**
 * AnswerGateway adapter proxying to the Python RAG service (/answer). Until that
 * service is deployed (SEARCH_SERVICE_URL empty) it returns a graceful
 * not-configured answer instead of erroring.
 */
export class HttpAnswerGateway implements AnswerGateway {
  private readonly logger = new Logger(HttpAnswerGateway.name);

  constructor(
    private readonly serviceUrl: string,
    private readonly serviceToken: string,
  ) {}

  async answer(input: { ownerId: string; q: string }): Promise<GatewayAnswer> {
    if (!this.serviceUrl) return NOT_CONFIGURED;
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (this.serviceToken) headers.authorization = `Bearer ${this.serviceToken}`;
      const response = await fetch(`${this.serviceUrl}/answer`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ownerId: input.ownerId, query: input.q }),
      });
      if (!response.ok) return NOT_CONFIGURED;
      const body = (await response.json()) as {
        answer: string;
        grounded: boolean;
        sources: Array<{ documentId: string; score: number; snippet: string; kind?: string }>;
      };
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
    } catch (error) {
      this.logger.warn(`answer service unreachable: ${String(error)}`);
      return NOT_CONFIGURED;
    }
  }
}
