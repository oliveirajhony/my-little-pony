import { z } from 'zod';
import { editorCapabilities } from '../content/editor-schema';
import type { ToolDef } from '../tool-context';

const DEFAULT_LIMIT = 20;

export const miscTools: ToolDef[] = [
  {
    name: 'get_editor_capabilities',
    title: 'Capacidades do editor',
    description:
      'Lista todas as opções do editor com seus valores válidos: tipos de bloco, fontes, tamanhos, cores, alinhamentos, espaçamentos, marcas e formatos de entrada. Consulte antes de formatar.',
    scope: 'documents:read',
    annotations: { readOnlyHint: true },
    inputSchema: {},
    handle: async () => editorCapabilities(),
  },
  {
    name: 'list_messages',
    title: 'Listar mensagens',
    description:
      'Lista as mensagens de contato ("Fale com a gente") recebidas nos documentos, com a contagem de não-lidas.',
    scope: 'messages:read',
    annotations: { readOnlyHint: true },
    inputSchema: {
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT),
    },
    handle: async (ctx, args) => {
      const result = await ctx.uc.listMessages.execute({
        ownerId: ctx.ownerId,
        page: (args.page as number) ?? 1,
        limit: (args.limit as number) ?? DEFAULT_LIMIT,
      });
      return {
        items: result.items.map((m) => ({
          id: m.id,
          documentId: m.documentId,
          fromName: m.fromName,
          fromEmail: m.fromEmail,
          message: m.message,
          createdAt: m.createdAt.toISOString(),
          readAt: m.readAt ? m.readAt.toISOString() : null,
        })),
        total: result.total,
        unread: result.unread,
      };
    },
  },
  {
    name: 'mark_message_read',
    title: 'Marcar mensagem como lida',
    description: 'Marca uma mensagem de contato como lida.',
    scope: 'messages:write',
    annotations: { idempotentHint: true },
    inputSchema: { id: z.string().uuid() },
    handle: async (ctx, args) => {
      await ctx.uc.markMessageRead.execute({ id: args.id as string, ownerId: ctx.ownerId });
      return { read: true, id: args.id };
    },
  },
  {
    name: 'get_profile',
    title: 'Ler perfil',
    description: 'Retorna o perfil do usuário dono do token (nome, e-mail, avatar).',
    scope: 'profile:read',
    annotations: { readOnlyHint: true },
    inputSchema: {},
    handle: async (ctx) => {
      const user = await ctx.uc.getProfile.execute(ctx.ownerId);
      return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl };
    },
  },
  {
    name: 'update_profile',
    title: 'Atualizar perfil',
    description:
      'Atualiza nome e/ou e-mail. Trocar o e-mail exige currentPassword (a senha atual).',
    scope: 'profile:write',
    inputSchema: {
      name: z.string().optional(),
      email: z.string().email().optional(),
      currentPassword: z.string().optional(),
    },
    handle: async (ctx, args) => {
      const user = await ctx.uc.updateProfile.execute(ctx.ownerId, {
        name: args.name as string | undefined,
        email: args.email as string | undefined,
        currentPassword: args.currentPassword as string | undefined,
      });
      return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl };
    },
  },
  {
    name: 'search_documents',
    title: 'Buscar (semântica)',
    description: 'Busca semântica no conteúdo dos documentos do usuário.',
    scope: 'documents:read',
    annotations: { readOnlyHint: true },
    inputSchema: { q: z.string() },
    handle: async (ctx, args) => {
      const results = await ctx.uc.searchDocuments.execute({
        ownerId: ctx.ownerId,
        q: args.q as string,
      });
      return { results };
    },
  },
  {
    name: 'search_files',
    title: 'Buscar em arquivos',
    description:
      'Busca híbrida nos arquivos importados do usuário (PDF/DOCX/MD/HTML). Retorna só trechos de arquivos, com nome e score.',
    scope: 'files:read',
    annotations: { readOnlyHint: true },
    inputSchema: { q: z.string() },
    handle: async (ctx, args) => {
      const hits = await ctx.uc.searchDocuments.execute({
        ownerId: ctx.ownerId,
        q: args.q as string,
      });
      return { results: hits.filter((hit) => hit.kind === 'file') };
    },
  },
  {
    name: 'ask_files',
    title: 'Perguntar aos documentos',
    description:
      'RAG: responde em linguagem natural com base nos documentos e arquivos do usuário, citando as fontes. Diz que não encontrou quando não há base suficiente.',
    scope: 'files:read',
    annotations: { readOnlyHint: true },
    inputSchema: { q: z.string() },
    handle: async (ctx, args) => {
      return ctx.uc.answerQuestion.execute({ ownerId: ctx.ownerId, q: args.q as string });
    },
  },
];
