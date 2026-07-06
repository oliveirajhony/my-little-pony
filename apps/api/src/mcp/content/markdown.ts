import { marked } from 'marked';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

// Preserve underline/highlight/color spans as HTML in markdown output (turndown
// keeps unknown inline HTML verbatim), so a round-trip does not lose formatting.
turndown.keep(['u', 'mark', 'span']);

/** Markdown → HTML (synchronous; no async extensions are configured). */
export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

/** HTML → Markdown, for handing agents readable content. */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}
