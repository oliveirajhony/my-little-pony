// The editor's option catalogue — the exact values the Tiptap toolbar exposes
// in the web app. The MCP capabilities tool advertises these so external agents
// use valid values, and the sanitiser/serialiser enforce them.

export const BLOCK_TYPES = ['paragraph', 'heading', 'bulletList', 'orderedList'] as const;

export const HEADING_LEVELS = [1, 2, 3] as const;

export const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'] as const;

// Line heights offered by the toolbar ('' = default/unset).
export const LINE_HEIGHTS = ['1', '1.15', '1.5', '2', '2.5', '3'] as const;

// The 20 font families from the web font-picker.
export const FONT_FAMILIES = [
  'Inter',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Garamond',
  'Courier New',
  'Verdana',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Merriweather',
  'Playfair Display',
  'Source Sans Pro',
  'Nunito',
  'Raleway',
  'PT Serif',
  'Comfortaa',
] as const;

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 48;

// Text colour palette (font colour). Hex values are still accepted freely.
export const TEXT_COLORS = [
  '#000000',
  '#374151',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
] as const;

// Highlight (text background) palette.
export const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e9d5ff'] as const;

export type TextAlign = (typeof TEXT_ALIGNS)[number];
export type HeadingLevel = (typeof HEADING_LEVELS)[number];

export const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Whole capability catalogue, returned by the MCP `get_editor_capabilities` tool. */
export function editorCapabilities() {
  return {
    blockTypes: BLOCK_TYPES,
    headingLevels: HEADING_LEVELS,
    textAligns: TEXT_ALIGNS,
    lineHeights: LINE_HEIGHTS,
    fontFamilies: FONT_FAMILIES,
    fontSize: { min: FONT_SIZE_MIN, max: FONT_SIZE_MAX, unit: 'px' },
    textColors: TEXT_COLORS,
    highlightColors: HIGHLIGHT_COLORS,
    marks: [
      'bold',
      'italic',
      'underline',
      'strike',
      'color',
      'fontFamily',
      'fontSize',
      'highlight',
    ],
    otherNodes: ['horizontalRule', 'image'],
    inputFormats: ['markdown', 'html'],
  };
}
