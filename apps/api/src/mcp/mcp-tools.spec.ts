import {
  type Clock,
  CreateDocument,
  DeleteDocument,
  Document,
  type DocumentPage,
  type DocumentQuery,
  type DocumentRepository,
  GetDocument,
  type IdGenerator,
  PAT_SCOPES,
  SaveDraft,
} from '@my-little-pony/core';
import { ALL_TOOLS } from './build-mcp-server';
import { type McpUseCases, ToolContext } from './tool-context';
import { documentsTools } from './tools/documents-tools';
import { editingTools } from './tools/editing-tools';

const clock: Clock = { now: () => new Date('2026-07-05T00:00:00.000Z') };
let seq = 0;
const ids: IdGenerator = { next: () => `d${++seq}` };

describe('MCP tool registry (security metadata)', () => {
  it('every tool declares a valid scope from PAT_SCOPES', () => {
    for (const tool of ALL_TOOLS) {
      expect(PAT_SCOPES).toContain(tool.scope);
    }
  });

  it('has unique tool names', () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('marks destructive tools with the destructive hint', () => {
    const destructive = ALL_TOOLS.filter((t) =>
      ['delete_document', 'update_document'].includes(t.name),
    );
    for (const tool of destructive) {
      expect(tool.annotations?.destructiveHint).toBe(true);
    }
  });
});

class InMemoryDocs implements DocumentRepository {
  store = new Map<string, Document>();
  async save(doc: Document) {
    this.store.set(doc.id, Document.fromProps(doc.toProps()));
  }
  async findById(id: string) {
    const doc = this.store.get(id);
    return doc ? Document.fromProps(doc.toProps()) : null;
  }
  async delete(id: string) {
    this.store.delete(id);
  }
  async findPublishedBySlug() {
    return null;
  }
  async list(query: DocumentQuery): Promise<DocumentPage> {
    const items = [...this.store.values()].filter((d) => d.isOwnedBy(query.ownerId));
    return { items, total: items.length };
  }
}

function tool(list: typeof documentsTools, name: string) {
  const found = list.find((t) => t.name === name);
  if (!found) throw new Error(`tool ${name} not found`);
  return found;
}

function buildCtx() {
  const repo = new InMemoryDocs();
  const uc = {
    listDocuments: { execute: (q: DocumentQuery) => repo.list(q) },
    createDocument: new CreateDocument(repo, ids, clock),
    getDocument: new GetDocument(repo),
    saveDraft: new SaveDraft(repo, clock),
    deleteDocument: new DeleteDocument(repo),
    cache: { get: async () => null, set: async () => {}, delete: async () => {} },
  } as unknown as McpUseCases;
  return new ToolContext('u1', uc);
}

beforeEach(() => {
  seq = 0;
});

describe('MCP document tools', () => {
  it('creates a document from markdown and reads it back', async () => {
    const ctx = buildCtx();
    const created = (await tool(documentsTools, 'create_document').handle(ctx, {
      title: 'Guia',
      content: '# Olá\n\nmundo **forte**',
      format: 'markdown',
    })) as { id: string; contentHtml: string };
    expect(created.contentHtml).toContain('<h1>Olá</h1>');
    expect(created.contentHtml).toContain('<strong>forte</strong>');

    const fetched = (await tool(documentsTools, 'get_document').handle(ctx, {
      id: created.id,
    })) as { contentMarkdown: string };
    expect(fetched.contentMarkdown).toContain('# Olá');
  });

  it('persists page config through set_page_config', async () => {
    const ctx = buildCtx();
    const created = (await tool(documentsTools, 'create_document').handle(ctx, {})) as {
      id: string;
    };
    const updated = (await tool(documentsTools, 'set_page_config').handle(ctx, {
      id: created.id,
      orientation: 'landscape',
      margins: { left: 1 },
    })) as { pageConfig: { orientation: string; margins: { left: number } } };
    expect(updated.pageConfig.orientation).toBe('landscape');
    expect(updated.pageConfig.margins.left).toBe(1);
  });
});

describe('MCP editing tools', () => {
  it('formats a text range as bold via block editing', async () => {
    const ctx = buildCtx();
    const created = (await tool(documentsTools, 'create_document').handle(ctx, {
      content: 'abcdef',
      format: 'markdown',
    })) as { id: string };

    await tool(editingTools, 'format_text').handle(ctx, {
      id: created.id,
      blockIndex: 0,
      from: 2,
      to: 4,
      marks: { bold: true },
    });

    const content = (await tool(editingTools, 'get_document_content').handle(ctx, {
      id: created.id,
    })) as { blocks: { text: string }[] };
    expect(content.blocks[0].text).toBe('abcdef');

    const doc = (await tool(documentsTools, 'get_document').handle(ctx, {
      id: created.id,
    })) as { contentHtml: string };
    expect(doc.contentHtml).toContain('<strong>cd</strong>');
  });
});
