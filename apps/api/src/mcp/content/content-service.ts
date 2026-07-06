import { type Block, blocksToHtml, htmlToBlocks } from './block-model';
import { htmlToMarkdown, markdownToHtml } from './markdown';
import { sanitizeContentHtml } from './sanitize';

export type ContentFormat = 'markdown' | 'html';

/**
 * Converts between the formats an external agent uses (Markdown / HTML), the
 * canonical stored HTML, and the structured block model the editing tools use.
 * Everything that ends up as document content is sanitised to the editor schema.
 */
export const contentService = {
  /** Agent input (markdown or html) → sanitised, editor-compatible HTML. */
  normalize(content: string, format: ContentFormat): string {
    const html = format === 'markdown' ? markdownToHtml(content) : content;
    return sanitizeContentHtml(html);
  },

  /** Stored HTML → the flat block model (sanitises first for safety). */
  toBlocks(html: string): Block[] {
    return htmlToBlocks(sanitizeContentHtml(html));
  },

  /** Block model → sanitised HTML ready to persist. */
  fromBlocks(blocks: Block[]): string {
    return sanitizeContentHtml(blocksToHtml(blocks));
  },

  /** Stored HTML → Markdown, for agents that prefer reading markdown. */
  toMarkdown(html: string): string {
    return htmlToMarkdown(html);
  },
};
