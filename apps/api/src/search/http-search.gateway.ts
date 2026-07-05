import type { SearchGateway, SearchHit } from '@my-little-pony/core';
import { Logger } from '@nestjs/common';

/**
 * SearchGateway adapter proxying to the Python search service. Until that
 * service is deployed (SEARCH_SERVICE_URL empty), it returns no results so the
 * endpoint stays available instead of erroring.
 */
export class HttpSearchGateway implements SearchGateway {
  private readonly logger = new Logger(HttpSearchGateway.name);

  constructor(private readonly serviceUrl: string) {}

  async search(input: { ownerId: string; q: string }): Promise<SearchHit[]> {
    if (!this.serviceUrl) return [];
    try {
      const response = await fetch(`${this.serviceUrl}/search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) return [];
      return (await response.json()) as SearchHit[];
    } catch (error) {
      this.logger.warn(`search service unreachable: ${String(error)}`);
      return [];
    }
  }
}
