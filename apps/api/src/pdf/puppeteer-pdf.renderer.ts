import type { PdfRenderer } from '@my-little-pony/core';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer';

/** Escapa texto para uso seguro em HTML (título vem do usuário). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Documento A4 self-contained: conteúdo do editor + CSS de impressão inline. */
function documentHtml(title: string, contentHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #1a1a1a;
    font-size: 12pt;
    line-height: 1.55;
  }
  h1, h2, h3 { font-family: Arial, Helvetica, sans-serif; line-height: 1.25; margin: 1.2em 0 0.5em; }
  h1 { font-size: 20pt; }
  h2 { font-size: 16pt; }
  h3 { font-size: 13pt; }
  p { margin: 0 0 0.75em; }
  ul, ol { margin: 0 0 0.75em 1.4em; }
  img { max-width: 100%; height: auto; }
  a { color: #2563eb; text-decoration: underline; }
  blockquote { margin: 0 0 0.75em; padding-left: 1em; border-left: 3px solid #d4d4d8; color: #52525b; }
  pre { background: #f4f4f5; padding: 0.75em; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; }
  code { font-family: 'Courier New', monospace; font-size: 0.95em; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #d4d4d8; padding: 0.4em 0.6em; }
</style>
</head>
<body>${contentHtml}</body>
</html>`;
}

/**
 * PdfRenderer via Puppeteer (Chromium headless). Reutiliza um único browser por
 * processo — abrir Chromium por request seria caro. `page.setContent` evita
 * depender do app web em execução.
 */
@Injectable()
export class PuppeteerPdfRenderer implements PdfRenderer, OnModuleDestroy {
  private browser?: Promise<Browser>;

  private launch(): Promise<Browser> {
    this.browser ??= puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    return this.browser;
  }

  async render(input: { title: string; contentHtml: string }): Promise<Uint8Array> {
    const browser = await this.launch();
    const page = await browser.newPage();
    try {
      // Segurança (SSRF): o HTML é do usuário. Bloqueia qualquer requisição de
      // rede do Chromium — só imagens embutidas (data:) passam. Assim um doc com
      // <img src="http://host-interno/…"> não faz o renderer buscar o recurso.
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().startsWith('data:')) void request.continue();
        else void request.abort();
      });
      await page.setContent(documentHtml(input.title, input.contentHtml), {
        waitUntil: 'load',
      });
      return await page.pdf({ format: 'A4', printBackground: true });
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    const browser = await this.browser?.catch(() => undefined);
    await browser?.close();
  }
}
