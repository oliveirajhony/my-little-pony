import type { PdfRenderer } from '@my-little-pony/core';
import { describe, expect, it, vi } from 'vitest';
import { AnswerExporter } from './answer-exporter';

function build(render = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))) {
  const renderer: PdfRenderer = { render };
  return { exporter: new AnswerExporter(renderer), render };
}

describe('AnswerExporter', () => {
  it('exporta markdown como passthrough (text/markdown)', async () => {
    const { exporter } = build();
    const file = await exporter.export({
      format: 'md',
      title: 'Análise de Dados',
      content: '# Oi\n\ntexto [1]',
    });

    expect(file.contentType).toBe('text/markdown; charset=utf-8');
    expect(file.filename).toBe('Analise-de-Dados.md');
    expect(new TextDecoder().decode(file.bytes)).toBe('# Oi\n\ntexto [1]');
  });

  it('exporta pdf: converte markdown→HTML pro renderer e devolve application/pdf', async () => {
    const { exporter, render } = build();
    const file = await exporter.export({
      format: 'pdf',
      title: 'Resposta',
      content: '# Título\n\ncorpo',
    });

    expect(render).toHaveBeenCalledTimes(1);
    const arg = render.mock.calls[0][0];
    expect(arg.title).toBe('Resposta');
    expect(arg.contentHtml).toContain('<h1>Título</h1>');
    expect(file.contentType).toBe('application/pdf');
    expect(file.filename).toBe('Resposta.pdf');
    expect(file.bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('usa "Resposta" quando não há título', async () => {
    const { exporter } = build();
    const file = await exporter.export({ format: 'md', content: 'x' });
    expect(file.filename).toBe('Resposta.md');
  });

  it('sanitiza acentos, espaços e caracteres inválidos no filename', async () => {
    const { exporter } = build();
    const file = await exporter.export({
      format: 'md',
      title: 'Relatório: Q3/2025 *final*',
      content: 'x',
    });

    expect(file.filename).toMatch(/^[\w.-]+\.md$/);
    expect(file.filename).toContain('Relatorio');
  });
});
