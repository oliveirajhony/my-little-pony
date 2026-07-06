import type { SearchGateway, SearchHit } from '@my-little-pony/core';
import { Logger } from '@nestjs/common';

/**
 * SearchGateway adapter proxying to the Python search service. Until that
 * service is deployed (SEARCH_SERVICE_URL empty), it returns no results so the
 * endpoint stays available instead of erroring.
 */
export class HttpSearchGateway implements SearchGateway {
  private readonly logger = new Logger(HttpSearchGateway.name);

  constructor(
    private readonly serviceUrl: string,
    private readonly serviceToken: string,
  ) {}

  async search(input: { ownerId: string; q: string }): Promise<SearchHit[]> {
    if (!this.serviceUrl) return [];
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (this.serviceToken) headers.authorization = `Bearer ${this.serviceToken}`;
      const response = await fetch(`${this.serviceUrl}/search`, {
        method: 'POST',
        headers,
        // The Python service expects `query` (not `q`); ownerId scopes the tenant.
        body: JSON.stringify({ ownerId: input.ownerId, query: input.q }),
      });
      if (!response.ok) return [];
      const hits = (await response.json()) as Array<SearchHit & { kind?: string }>;
      return hits.map((hit) => ({
        documentId: hit.documentId,
        score: hit.score,
        snippet: hit.snippet,
        kind: hit.kind === 'file' ? 'file' : 'native',
      }));
    } catch (error) {
      this.logger.warn(`search service unreachable: ${String(error)}`);
      return [];
    }
  }
}
