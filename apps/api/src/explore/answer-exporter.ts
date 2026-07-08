import type { PdfRenderer } from '@my-little-pony/core';
import { Inject, Injectable } from '@nestjs/common';
import { markdownToHtml } from '../mcp/content/markdown';
import { PDF_RENDERER } from '../tokens';

export type ExportFormat = 'pdf' | 'md';

export type ExportedFile = {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
};

/**
 * Gera o arquivo de download de uma resposta do Explorar — efêmero (nada é
 * persistido). Reusa o mesmo render Puppeteer do publish (markdown→HTML→PDF);
 * markdown é passthrough do próprio texto.
 */
@Injectable()
export class AnswerExporter {
  constructor(@Inject(PDF_RENDERER) private readonly pdf: PdfRenderer) {}

  async export(input: {
    format: ExportFormat;
    title?: string;
    content: string;
  }): Promise<ExportedFile> {
    const title = input.title?.trim() || 'Resposta';
    const base = safeFilename(title);

    if (input.format === 'md') {
      return {
        bytes: new TextEncoder().encode(input.content),
        contentType: 'text/markdown; charset=utf-8',
        filename: `${base}.md`,
      };
    }

    const contentHtml = markdownToHtml(input.content);
    const bytes = await this.pdf.render({ title, contentHtml });
    return { bytes, contentType: 'application/pdf', filename: `${base}.pdf` };
  }
}

// Faixa de diacríticos combinantes (U+0300–U+036F) — decompostos pelo NFKD.
const DIACRITICS = /[̀-ͯ]/g;
const UNSAFE_FILENAME = /[^\w\s.-]/g;

/** Nome de arquivo ASCII-seguro: tira diacríticos e caracteres inválidos. */
function safeFilename(title: string): string {
  const cleaned = title
    .normalize('NFKD')
    .replace(DIACRITICS, '') // á → a
    .replace(UNSAFE_FILENAME, '') // só palavra/espaço/ponto/hífen
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return cleaned || 'resposta';
}
