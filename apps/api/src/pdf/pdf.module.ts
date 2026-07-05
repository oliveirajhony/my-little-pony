import { Global, Module } from '@nestjs/common';
import { PDF_RENDERER } from '../tokens';
import { PuppeteerPdfRenderer } from './puppeteer-pdf.renderer';

// Liga a porta PdfRenderer ao adapter Puppeteer, disponível app-wide.
// A classe é registrada diretamente para receber os hooks de ciclo de vida
// (onModuleDestroy fecha o Chromium); o token é um alias dela.
@Global()
@Module({
  providers: [PuppeteerPdfRenderer, { provide: PDF_RENDERER, useExisting: PuppeteerPdfRenderer }],
  exports: [PDF_RENDERER],
})
export class PdfModule {}
