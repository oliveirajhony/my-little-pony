import { Document } from '../domain/document.js';
import { SourceFile } from '../domain/source-file.js';
import type { DocumentRepository, SearchGateway, SourceFileRepository } from './ports.js';
import { SearchDocuments } from './search-use-cases.js';

const now = new Date('2026-07-05T00:00:00.000Z');

function docRepoWith(docs: Document[]): DocumentRepository {
  const byId = new Map(docs.map((d) => [d.id, d]));
  return {
    findById: async (id) => byId.get(id) ?? null,
    save: async () => {},
    delete: async () => {},
    list: async () => ({ items: [], total: 0 }),
    findPublishedBySlug: async () => null,
  };
}

function fileRepoWith(files: SourceFile[]): SourceFileRepository {
  const byId = new Map(files.map((f) => [f.id, f]));
  return {
    findById: async (id) => byId.get(id) ?? null,
    save: async () => {},
    delete: async () => {},
    listByOwner: async () => [],
  };
}

const noFiles = fileRepoWith([]);
const noDocs = docRepoWith([]);

describe('SearchDocuments', () => {
  it('returns empty for a blank query without calling the gateway', async () => {
    let called = false;
    const gateway: SearchGateway = {
      search: async () => {
        called = true;
        return [];
      },
    };
    const result = await new SearchDocuments(gateway, noDocs, noFiles).execute({
      ownerId: 'u1',
      q: '   ',
    });
    expect(result).toEqual([]);
    expect(called).toBe(false);
  });

  it('enriches native hits with owned document metadata', async () => {
    const doc = Document.create({ id: 'd1', ownerId: 'u1', title: 'Café', now });
    const gateway: SearchGateway = {
      search: async () => [{ documentId: 'd1', score: 0.9, snippet: 'origem do café' }],
    };
    const result = await new SearchDocuments(gateway, docRepoWith([doc]), noFiles).execute({
      ownerId: 'u1',
      q: 'café',
    });
    expect(result).toEqual([
      {
        documentId: 'd1',
        score: 0.9,
        snippet: 'origem do café',
        kind: 'native',
        title: 'Café',
        slug: 'cafe',
      },
    ]);
  });

  it('enriches file hits with the owner filename and a null slug', async () => {
    const file = SourceFile.create({
      id: 'f1',
      ownerId: 'u1',
      filename: 'contrato.pdf',
      contentType: 'application/pdf',
      sizeBytes: 10,
      now,
    });
    const gateway: SearchGateway = {
      search: async () => [{ documentId: 'f1', score: 0.8, snippet: 'cláusula', kind: 'file' }],
    };
    const result = await new SearchDocuments(gateway, noDocs, fileRepoWith([file])).execute({
      ownerId: 'u1',
      q: 'cláusula',
    });
    expect(result).toEqual([
      {
        documentId: 'f1',
        score: 0.8,
        snippet: 'cláusula',
        kind: 'file',
        title: 'contrato.pdf',
        slug: null,
      },
    ]);
  });

  it('drops hits the caller does not own', async () => {
    const doc = Document.create({ id: 'd1', ownerId: 'someone-else', title: 'X', now });
    const gateway: SearchGateway = {
      search: async () => [{ documentId: 'd1', score: 0.9, snippet: 's' }],
    };
    const result = await new SearchDocuments(gateway, docRepoWith([doc]), noFiles).execute({
      ownerId: 'u1',
      q: 'x',
    });
    expect(result).toEqual([]);
  });
});
