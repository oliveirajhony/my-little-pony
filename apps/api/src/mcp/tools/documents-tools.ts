import { z } from 'zod';
import { contentService } from '../content/content-service';
import type { ToolContext, ToolDef } from '../tool-context';
import { documentDetail, documentSummary } from './document-view';
import { contentFormat, pageConfigShape } from './schemas';

async function publicUrl(ctx: ToolContext, id: string): Promise<string | null> {
  const doc = await ctx.uc.getDocument.execute({ id, ownerId: ctx.ownerId });
  if (doc.status !== 'published') return null;
  return `/d/${ctx.ownerId}/${doc.slug}`;
}

export const documentsTools: ToolDef[] = [
  {
    name: 'list_documents',
    title: 'Listar documentos',
    description:
      'Lista os documentos do usuário com busca full-text e filtros (status, categoria), paginado.',
    scope: 'documents:read',
    annotations: { readOnlyHint: true },
    inputSchema: {
      q: z.string().optional().describe('Busca por título/conteúdo.'),
      status: z.enum(['draft', 'published']).optional(),
      category: z.string().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
    },
    handle: async (ctx, args) => {
      const result = await ctx.uc.listDocuments.execute({
        ownerId: ctx.ownerId,
        q: args.q as string | undefined,
        status: args.status as 'draft' | 'published' | undefined,
        category: args.category as string | undefined,
        page: (args.page as number) ?? 1,
        limit: (args.limit as number) ?? 20,
      });
      return {
        items: result.items.map(documentSummary),
        total: result.total,
        page: (args.page as number) ?? 1,
        limit: (args.limit as number) ?? 20,
      };
    },
  },
  {
    name: 'get_document',
    title: 'Ler documento',
    description:
      'Retorna um documento completo: metadados, conteúdo em Markdown e HTML, e a configuração de página.',
    scope: 'documents:read',
    annotations: { readOnlyHint: true },
    inputSchema: { id: z.string().uuid() },
    handle: async (ctx, args) => {
      const doc = await ctx.uc.getDocument.execute({ id: args.id as string, ownerId: ctx.ownerId });
      return documentDetail(doc);
    },
  },
  {
    name: 'get_public_url',
    title: 'URL pública',
    description: 'Retorna a URL pública (/d/:ownerId/:slug) de um documento publicado, ou null.',
    scope: 'documents:read',
    annotations: { readOnlyHint: true },
    inputSchema: { id: z.string().uuid() },
    handle: async (ctx, args) => ({ url: await publicUrl(ctx, args.id as string) }),
  },
  {
    name: 'create_document',
    title: 'Criar documento',
    description:
      'Cria um rascunho. Aceite content em Markdown (recomendado) ou HTML; opcionalmente categorias e configuração de página.',
    scope: 'documents:write',
    inputSchema: {
      title: z.string().optional(),
      content: z.string().optional(),
      format: contentFormat,
      categories: z.array(z.string()).optional(),
      pageConfig: z.object(pageConfigShape).optional(),
    },
    handle: async (ctx, args) => {
      const created = await ctx.uc.createDocument.execute({
        ownerId: ctx.ownerId,
        title: args.title as string | undefined,
      });
      const hasEdits = args.content !== undefined || args.categories || args.pageConfig;
      if (!hasEdits) return documentDetail(created);
      const html =
        args.content !== undefined
          ? contentService.normalize(args.content as string, args.format as 'markdown' | 'html')
          : undefined;
      const saved = await ctx.saveDocument(created.id, {
        content: html,
        categories: args.categories as string[] | undefined,
        pageConfig: args.pageConfig as never,
      });
      return documentDetail(saved);
    },
  },
  {
    name: 'update_document',
    title: 'Atualizar documento',
    description:
      'Atualiza título, conteúdo (Markdown/HTML — substitui o conteúdo inteiro), slug, categorias e/ou configuração de página. A concorrência é gerida automaticamente.',
    scope: 'documents:write',
    annotations: { destructiveHint: true },
    inputSchema: {
      id: z.string().uuid(),
      title: z.string().optional(),
      content: z.string().optional(),
      format: contentFormat,
      slug: z.string().optional(),
      categories: z.array(z.string()).optional(),
      pageConfig: z.object(pageConfigShape).optional(),
    },
    handle: async (ctx, args) => {
      const html =
        args.content !== undefined
          ? contentService.normalize(args.content as string, args.format as 'markdown' | 'html')
          : undefined;
      const saved = await ctx.saveDocument(args.id as string, {
        title: args.title as string | undefined,
        content: html,
        slug: args.slug as string | undefined,
        categories: args.categories as string[] | undefined,
        pageConfig: args.pageConfig as never,
      });
      return documentDetail(saved);
    },
  },
  {
    name: 'set_page_config',
    title: 'Configuração de página',
    description:
      'Ajusta apenas a página/tema do documento (papel, orientação, margens, cor de fundo, tema claro/escuro/sistema) sem tocar no conteúdo.',
    scope: 'documents:write',
    inputSchema: { id: z.string().uuid(), ...pageConfigShape },
    handle: async (ctx, args) => {
      const { id, ...pageConfig } = args;
      const saved = await ctx.saveDocument(id as string, { pageConfig: pageConfig as never });
      return documentDetail(saved);
    },
  },
  {
    name: 'delete_document',
    title: 'Apagar documento',
    description: 'Remove um documento permanentemente. Exige o id exato.',
    scope: 'documents:write',
    annotations: { destructiveHint: true, idempotentHint: true },
    inputSchema: { id: z.string().uuid() },
    handle: async (ctx, args) => {
      await ctx.uc.deleteDocument.execute({ id: args.id as string, ownerId: ctx.ownerId });
      return { deleted: true, id: args.id };
    },
  },
  {
    name: 'publish_document',
    title: 'Publicar documento',
    description: 'Publica o documento (gera slug único) e retorna a URL pública.',
    scope: 'documents:publish',
    inputSchema: { id: z.string().uuid() },
    handle: async (ctx, args) => {
      const doc = await ctx.uc.publishDocument.execute({
        id: args.id as string,
        ownerId: ctx.ownerId,
      });
      await ctx.uc.cache.delete(`public:doc:${ctx.ownerId}:${doc.slug}`);
      return { ...documentSummary(doc), url: `/d/${ctx.ownerId}/${doc.slug}` };
    },
  },
  {
    name: 'unpublish_document',
    title: 'Despublicar documento',
    description: 'Volta o documento a rascunho e remove a página pública.',
    scope: 'documents:publish',
    annotations: { idempotentHint: true },
    inputSchema: { id: z.string().uuid() },
    handle: async (ctx, args) => {
      const doc = await ctx.uc.unpublishDocument.execute({
        id: args.id as string,
        ownerId: ctx.ownerId,
      });
      await ctx.uc.cache.delete(`public:doc:${ctx.ownerId}:${doc.slug}`);
      return documentSummary(doc);
    },
  },
];
