import sanitizeHtml from 'sanitize-html';

// Allowlist mirroring the editor's Tiptap schema. Anything outside it (scripts,
// event handlers, arbitrary tags/styles) is dropped, closing the XSS vector on
// published content.
const ALLOWED_STYLES: Record<string, RegExp[]> = {
  color: [/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/],
  'background-color': [/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/],
  'font-family': [/^[\w\s,'"-]+$/],
  'font-size': [/^\d+(?:\.\d+)?(?:px|pt|em|rem)$/],
  'text-align': [/^(?:left|right|center|justify)$/],
  'line-height': [/^\d+(?:\.\d+)?$/],
};

/** Sanitises arbitrary HTML down to the editor's supported nodes and marks. */
export function sanitizeContentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'h1',
      'h2',
      'h3',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'del',
      'span',
      'mark',
      'ul',
      'ol',
      'li',
      'hr',
      'br',
      'img',
      'a',
    ],
    allowedAttributes: {
      span: ['style'],
      mark: ['style'],
      p: ['style'],
      h1: ['style'],
      h2: ['style'],
      h3: ['style'],
      li: ['style'],
      img: ['src', 'alt', 'width', 'height'],
      a: ['href', 'title', 'target', 'rel'],
    },
    allowedStyles: { '*': ALLOWED_STYLES },
    allowedSchemes: ['http', 'https', 'data', 'mailto'],
    // Keep data: URIs for inline (base64) images, as the editor produces them.
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    transformTags: {
      // Normalise semantic aliases the editor emits canonically.
      b: 'strong',
      i: 'em',
    },
  });
}
