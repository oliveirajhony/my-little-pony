import { z } from 'zod';
import {
  applyMarksToRange,
  type Block,
  isTextBlock,
  type Marks,
  runsToText,
} from '../content/block-model';
import { contentService } from '../content/content-service';
import { HEADING_LEVELS } from '../content/editor-schema';
import type { ToolContext, ToolDef } from '../tool-context';
import { alignEnum, marksSchema } from './schemas';

/** Reads the document, hands the blocks to the mutator, saves the result. */
async function editBlocks(
  ctx: ToolContext,
  id: string,
  mutate: (blocks: Block[]) => void,
): Promise<Block[]> {
  const doc = await ctx.uc.getDocument.execute({ id, ownerId: ctx.ownerId });
  const blocks = contentService.toBlocks(doc.content);
  mutate(blocks);
  await ctx.saveDocument(id, { content: contentService.fromBlocks(blocks) });
  return blocks;
}

/** Serialises blocks with their index for an agent to address. */
function serialize(blocks: Block[]) {
  return blocks.map((block, index) => {
    if (isTextBlock(block)) {
      return {
        index,
        type: block.type,
        ...(block.type === 'heading' ? { level: block.level } : {}),
        align: block.align ?? null,
        text: runsToText(block.runs),
      };
    }
    if (block.type === 'bulletList' || block.type === 'orderedList') {
      return { index, type: block.type, items: block.items.map(runsToText) };
    }
    if (block.type === 'image') {
      return { index, type: 'image', src: block.src, alt: block.alt ?? null };
    }
    return { index, type: block.type };
  });
}

function assertIndex(blocks: Block[], index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= blocks.length) {
    throw new Error(`Bloco ${index} não existe (o documento tem ${blocks.length} blocos).`);
  }
}

function makeTextBlock(
  type: 'paragraph' | 'heading',
  text: string,
  level: number | undefined,
  align: string | undefined,
): Block {
  const runs = text ? [{ text }] : [];
  if (type === 'heading') {
    return { type: 'heading', level: (level ?? 1) as 1 | 2 | 3, runs, align: align as never };
  }
  return { type: 'paragraph', runs, align: align as never };
}

export const editingTools: ToolDef[] = [
  {
    name: 'get_document_content',
    title: 'Ler blocos do documento',
    description:
      'Retorna os blocos do documento indexados (tipo, alinhamento, texto), como o editor os vê — use os índices nas ferramentas de edição.',
    scope: 'documents:read',
    annotations: { readOnlyHint: true },
    inputSchema: { id: z.string().uuid() },
    handle: async (ctx, args) => {
      const doc = await ctx.uc.getDocument.execute({ id: args.id as string, ownerId: ctx.ownerId });
      return { blocks: serialize(contentService.toBlocks(doc.content)) };
    },
  },
  {
    name: 'insert_block',
    title: 'Inserir bloco',
    description:
      'Insere um parágrafo ou título com texto em uma posição (at; padrão = fim). Para formatação rica use markdown em update_document.',
    scope: 'documents:write',
    inputSchema: {
      id: z.string().uuid(),
      type: z.enum(['paragraph', 'heading']).default('paragraph'),
      level: z
        .number()
        .int()
        .refine((v) => (HEADING_LEVELS as readonly number[]).includes(v), 'Nível 1, 2 ou 3.')
        .optional(),
      text: z.string().default(''),
      align: alignEnum.optional(),
      at: z.number().int().min(0).optional().describe('Índice de inserção; padrão = fim.'),
    },
    handle: async (ctx, args) => {
      const blocks = await editBlocks(ctx, args.id as string, (bs) => {
        const block = makeTextBlock(
          args.type as 'paragraph' | 'heading',
          args.text as string,
          args.level as number | undefined,
          args.align as string | undefined,
        );
        const at = args.at === undefined ? bs.length : Math.min(args.at as number, bs.length);
        bs.splice(at, 0, block);
      });
      return { blocks: serialize(blocks) };
    },
  },
  {
    name: 'update_block',
    title: 'Atualizar bloco',
    description: 'Muda o tipo, o texto e/ou o alinhamento de um bloco de texto pelo índice.',
    scope: 'documents:write',
    annotations: { destructiveHint: true },
    inputSchema: {
      id: z.string().uuid(),
      index: z.number().int().min(0),
      type: z.enum(['paragraph', 'heading']).optional(),
      level: z.number().int().optional(),
      text: z.string().optional(),
      align: alignEnum.optional(),
    },
    handle: async (ctx, args) => {
      const blocks = await editBlocks(ctx, args.id as string, (bs) => {
        assertIndex(bs, args.index as number);
        const current = bs[args.index as number];
        if (!isTextBlock(current)) throw new Error('Este bloco não é de texto.');
        const type = (args.type as 'paragraph' | 'heading' | undefined) ?? current.type;
        const text = args.text !== undefined ? (args.text as string) : runsToText(current.runs);
        const level =
          (args.level as number | undefined) ??
          (current.type === 'heading' ? current.level : undefined);
        const align =
          args.align !== undefined ? (args.align as string) : (current.align as string | undefined);
        bs[args.index as number] = makeTextBlock(type, text, level, align);
      });
      return { blocks: serialize(blocks) };
    },
  },
  {
    name: 'set_block_alignment',
    title: 'Alinhar bloco',
    description: 'Alinha um bloco de texto: esquerda, centro, direita ou justificado.',
    scope: 'documents:write',
    inputSchema: { id: z.string().uuid(), index: z.number().int().min(0), align: alignEnum },
    handle: async (ctx, args) => {
      const blocks = await editBlocks(ctx, args.id as string, (bs) => {
        assertIndex(bs, args.index as number);
        const block = bs[args.index as number];
        if (!isTextBlock(block)) throw new Error('Este bloco não é de texto.');
        block.align = args.align as never;
      });
      return { blocks: serialize(blocks) };
    },
  },
  {
    name: 'format_text',
    title: 'Formatar trecho',
    description:
      'Aplica marcas (negrito, itálico, cor, fonte, tamanho, marca-texto…) ao trecho [from, to) de um bloco de texto. Passe uma marca como false para removê-la.',
    scope: 'documents:write',
    inputSchema: {
      id: z.string().uuid(),
      blockIndex: z.number().int().min(0),
      from: z.number().int().min(0),
      to: z.number().int().min(0),
      marks: marksSchema,
    },
    handle: async (ctx, args) => {
      const blocks = await editBlocks(ctx, args.id as string, (bs) => {
        assertIndex(bs, args.blockIndex as number);
        const block = bs[args.blockIndex as number];
        if (!isTextBlock(block)) throw new Error('Este bloco não é de texto.');
        block.runs = applyMarksToRange(
          block.runs,
          args.from as number,
          args.to as number,
          args.marks as Marks,
        );
      });
      return { blocks: serialize(blocks) };
    },
  },
  {
    name: 'delete_block',
    title: 'Apagar bloco',
    description: 'Remove um bloco pelo índice.',
    scope: 'documents:write',
    annotations: { destructiveHint: true },
    inputSchema: { id: z.string().uuid(), index: z.number().int().min(0) },
    handle: async (ctx, args) => {
      const blocks = await editBlocks(ctx, args.id as string, (bs) => {
        assertIndex(bs, args.index as number);
        bs.splice(args.index as number, 1);
      });
      return { blocks: serialize(blocks) };
    },
  },
  {
    name: 'move_block',
    title: 'Mover bloco',
    description: 'Move um bloco da posição from para a posição to.',
    scope: 'documents:write',
    inputSchema: {
      id: z.string().uuid(),
      from: z.number().int().min(0),
      to: z.number().int().min(0),
    },
    handle: async (ctx, args) => {
      const blocks = await editBlocks(ctx, args.id as string, (bs) => {
        assertIndex(bs, args.from as number);
        const [block] = bs.splice(args.from as number, 1);
        const to = Math.min(args.to as number, bs.length);
        bs.splice(to, 0, block);
      });
      return { blocks: serialize(blocks) };
    },
  },
  {
    name: 'insert_horizontal_rule',
    title: 'Inserir linha divisória',
    description: 'Insere uma linha horizontal (divisória) em uma posição (padrão = fim).',
    scope: 'documents:write',
    inputSchema: { id: z.string().uuid(), at: z.number().int().min(0).optional() },
    handle: async (ctx, args) => {
      const blocks = await editBlocks(ctx, args.id as string, (bs) => {
        const at = args.at === undefined ? bs.length : Math.min(args.at as number, bs.length);
        bs.splice(at, 0, { type: 'horizontalRule' });
      });
      return { blocks: serialize(blocks) };
    },
  },
];
