import type { SearchGateway, SearchHit } from '@my-little-pony/core';
import { PythonServiceClient } from '../http/python-service.client';

/**
 * SearchGateway adapter proxying to the Python search service. Until that
 * service is deployed (SEARCH_SERVICE_URL empty), it returns no results so the
 * endpoint stays available instead of erroring. A configured-but-failing service
 * is logged by the client, not silently swallowed.
 */
export class HttpSearchGateway implements SearchGateway {
  private readonly client: PythonServiceClient;

  constructor(serviceUrl: string, serviceToken: string, timeoutMs = 15_000) {
    this.client = new PythonServiceClient(serviceUrl, serviceToken, timeoutMs);
  }

  async search(input: { ownerId: string; q: string }): Promise<SearchHit[]> {
    if (!this.client.configured) return []; // not deployed yet — expected, stay quiet
    try {
      // The Python service expects `query` (not `q`); ownerId scopes the tenant.
      const hits = await this.client.postJson<Array<SearchHit & { kind?: string }>>('/search', {
        ownerId: input.ownerId,
        query: input.q,
      });
      return hits.map((hit) => ({
        documentId: hit.documentId,
        score: hit.score,
        snippet: hit.snippet,
        kind: hit.kind === 'file' ? 'file' : 'native',
      }));
    } catch {
      return []; // degrade gracefully — the client already logged the failure
    }
  }
}
