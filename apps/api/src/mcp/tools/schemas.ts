import { DOCUMENT_THEMES, PAGE_ORIENTATIONS, PAPER_SIZES } from '@my-little-pony/core';
import { z } from 'zod';
import { HEX_COLOR, TEXT_ALIGNS } from '../content/editor-schema';

export const contentFormat = z
  .enum(['markdown', 'html'])
  .default('markdown')
  .describe('Formato do campo content. markdown é o recomendado para agentes.');

export const hexColor = z.string().regex(HEX_COLOR, 'Cor hex inválida (#rgb ou #rrggbb).');

export const alignEnum = z.enum(TEXT_ALIGNS);

export const marksSchema = z
  .object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strike: z.boolean().optional(),
    color: hexColor.optional(),
    fontFamily: z.string().optional(),
    fontSize: z.string().optional().describe('Ex.: "16px".'),
    highlight: hexColor.optional(),
  })
  .describe('Marcas de formatação inline. Passe false para remover uma marca.');

export const pageConfigShape = {
  paperSize: z.enum(PAPER_SIZES as unknown as [string, ...string[]]).optional(),
  orientation: z.enum(PAGE_ORIENTATIONS as unknown as [string, ...string[]]).optional(),
  pageColor: hexColor.optional().describe('Cor de fundo da página.'),
  documentTheme: z.enum(DOCUMENT_THEMES as unknown as [string, ...string[]]).optional(),
  margins: z
    .object({
      top: z.number().min(0).optional(),
      right: z.number().min(0).optional(),
      bottom: z.number().min(0).optional(),
      left: z.number().min(0).optional(),
    })
    .optional()
    .describe('Margens em centímetros.'),
};

export const pageConfigSchema = z.object(pageConfigShape);
