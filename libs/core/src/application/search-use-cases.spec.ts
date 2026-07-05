import { Document } from '../domain/document.js';
import type { DocumentRepository, SearchGateway } from './ports.js';
import { SearchDocuments } from './search-use-cases.js';

const now = new Date('2026-07-05T00:00:00.000Z');

function repoWith(docs: Document[]): DocumentRepository {
  const byId = new Map(docs.map((d) => [d.id, d]));
  return {
    findById: async (id) => byId.get(id) ?? null,
    save: async () => {},
    delete: async () => {},
    list: async () => ({ items: [], total: 0 }),
    findPublishedBySlug: async () => null,
  };
}

describe('SearchDocuments', () => {
  it('returns empty for a blank query without calling the gateway', async () => {
    let called = false;
    const gateway: SearchGateway = {
      search: async () => {
        called = true;
        return [];
      },
    };
    const result = await new SearchDocuments(gateway, repoWith([])).execute({
      ownerId: 'u1',
      q: '   ',
    });
    expect(result).toEqual([]);
    expect(called).toBe(false);
  });

  it('enriches hits with owned document metadata', async () => {
    const doc = Document.create({ id: 'd1', ownerId: 'u1', title: 'Café', now });
    const gateway: SearchGateway = {
      search: async () => [{ documentId: 'd1', score: 0.9, snippet: 'origem do café' }],
    };
    const result = await new SearchDocuments(gateway, repoWith([doc])).execute({
      ownerId: 'u1',
      q: 'café',
    });
    expect(result).toEqual([
      { documentId: 'd1', score: 0.9, snippet: 'origem do café', title: 'Café', slug: 'cafe' },
    ]);
  });

  it('drops hits the caller does not own', async () => {
    const doc = Document.create({ id: 'd1', ownerId: 'someone-else', title: 'X', now });
    const gateway: SearchGateway = {
      search: async () => [{ documentId: 'd1', score: 0.9, snippet: 's' }],
    };
    const result = await new SearchDocuments(gateway, repoWith([doc])).execute({
      ownerId: 'u1',
      q: 'x',
    });
    expect(result).toEqual([]);
  });
});
