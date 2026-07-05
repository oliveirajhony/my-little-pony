import { PAGE_SIZES } from 'tiptap-pagination-plus';

// Single source of truth for the document's page layout — shared by the editor,
// the toolbar, and the Page Setup dialog.

export type PaperSize = keyof typeof PAGE_SIZES; // 'A4' | 'A3' | 'A5' | 'LETTER' | 'LEGAL' | 'TABLOID'
export type Orientation = 'portrait' | 'landscape';
/** Page margins, in centimeters. */
export type Margins = { top: number; bottom: number; left: number; right: number };

export type PageConfig = {
  paperSize: PaperSize;
  orientation: Orientation;
  pageColor: string;
  margins: Margins;
};

/** Human labels (pt-BR) with real dimensions, shown in the paper-size picker. */
export const PAPER_LABELS: Record<PaperSize, string> = {
  A4: 'A4 (21 × 29,7 cm)',
  A3: 'A3 (29,7 × 42 cm)',
  A5: 'A5 (14,8 × 21 cm)',
  LETTER: 'Carta (21,6 × 27,9 cm)',
  LEGAL: 'Ofício (21,6 × 35,6 cm)',
  TABLOID: 'Tabloide (27,9 × 43,2 cm)',
};

export const PAGE_COLORS = ['#ffffff', '#fbfbfd', '#f7f5ef', '#eef3fb', '#f4f0fb', '#0f172a'];

export const DEFAULT_PAGE_CONFIG: PageConfig = {
  paperSize: 'A4',
  orientation: 'portrait',
  pageColor: '#ffffff',
  // A4 defaults (~the extension's own preset): 2.5 cm top/bottom, 2 cm sides.
  margins: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
};

const PX_PER_CM = 96 / 2.54; // 96 dpi
export const cmToPx = (cm: number) => Math.round(cm * PX_PER_CM);
export const pxToCm = (px: number) => Math.round((px / PX_PER_CM) * 10) / 10;

export type PageGeometry = {
  width: number;
  height: number;
  margins: { top: number; bottom: number; left: number; right: number }; // pixels
};

/** Convert a PageConfig into the pixel geometry the pagination extension expects. */
export function resolveGeometry(config: PageConfig): PageGeometry {
  const base = PAGE_SIZES[config.paperSize];
  const portrait = config.orientation === 'portrait';
  return {
    width: portrait ? base.pageWidth : base.pageHeight,
    height: portrait ? base.pageHeight : base.pageWidth,
    margins: {
      top: cmToPx(config.margins.top),
      bottom: cmToPx(config.margins.bottom),
      left: cmToPx(config.margins.left),
      right: cmToPx(config.margins.right),
    },
  };
}

export const DEFAULT_GEOMETRY = resolveGeometry(DEFAULT_PAGE_CONFIG);

/** A body text color that stays legible on the given page color. */
export function readableTextColor(pageColor: string): string {
  const hex = pageColor.replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const r = Number.parseInt(full.slice(0, 2), 16) || 0;
  const g = Number.parseInt(full.slice(2, 4), 16) || 0;
  const b = Number.parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1d1d1f' : '#f5f5f7';
}
