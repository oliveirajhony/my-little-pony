import { Document } from '../domain/document.js';
import { SourceFile } from '../domain/source-file.js';
import { AnswerQuestion } from './explore-use-cases.js';
import type { AnswerGateway, DocumentRepository, SourceFileRepository } from './ports.js';

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

const noDocs = docRepoWith([]);
const noFiles = fileRepoWith([]);

describe('AnswerQuestion (explore)', () => {
  it('returns empty without calling the gateway for a blank query', async () => {
    let called = false;
    const gateway: AnswerGateway = {
      answer: async () => {
        called = true;
        return { answer: '', grounded: false, sources: [] };
      },
    };
    const result = await new AnswerQuestion(gateway, noDocs, noFiles).execute({
      ownerId: 'u1',
      q: '  ',
    });
    expect(result).toEqual({ answer: '', grounded: false, sources: [] });
    expect(called).toBe(false);
  });

  it('passes through the answer and enriches sources with owner metadata', async () => {
    const doc = Document.create({ id: 'd1', ownerId: 'u1', title: 'Café', now });
    const file = SourceFile.create({
      id: 'f1',
      ownerId: 'u1',
      filename: 'contrato.pdf',
      contentType: 'application/pdf',
      sizeBytes: 10,
      now,
    });
    const gateway: AnswerGateway = {
      answer: async () => ({
        answer: 'Segundo [1] e [2]...',
        grounded: true,
        sources: [
          { documentId: 'd1', score: 0.9, snippet: 'a', kind: 'native' },
          { documentId: 'f1', score: 0.7, snippet: 'b', kind: 'file' },
        ],
      }),
    };
    const result = await new AnswerQuestion(
      gateway,
      docRepoWith([doc]),
      fileRepoWith([file]),
    ).execute({
      ownerId: 'u1',
      q: 'café',
    });
    expect(result.answer).toBe('Segundo [1] e [2]...');
    expect(result.grounded).toBe(true);
    expect(result.sources).toEqual([
      { documentId: 'd1', score: 0.9, snippet: 'a', kind: 'native', title: 'Café', slug: 'cafe' },
      {
        documentId: 'f1',
        score: 0.7,
        snippet: 'b',
        kind: 'file',
        title: 'contrato.pdf',
        slug: null,
      },
    ]);
  });

  it('drops sources the caller does not own', async () => {
    const doc = Document.create({ id: 'd1', ownerId: 'someone-else', title: 'X', now });
    const gateway: AnswerGateway = {
      answer: async () => ({
        answer: 'resposta',
        grounded: true,
        sources: [{ documentId: 'd1', score: 0.9, snippet: 's', kind: 'native' }],
      }),
    };
    const result = await new AnswerQuestion(gateway, docRepoWith([doc]), noFiles).execute({
      ownerId: 'u1',
      q: 'x',
    });
    expect(result.sources).toEqual([]);
  });
});
