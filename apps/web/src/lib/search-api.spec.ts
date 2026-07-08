import { describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn().mockResolvedValue([]);
vi.mock('./api-client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

import { searchDocuments } from './search-api';

describe('searchDocuments', () => {
  it('chama GET /search com o q codificado', async () => {
    apiFetch.mockClear();
    await searchDocuments('café & dados');
    expect(apiFetch).toHaveBeenCalledWith('/search?q=caf%C3%A9%20%26%20dados');
  });
});
