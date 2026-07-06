import { DomainError } from './errors.js';

export type PaperSize = 'A4' | 'A3' | 'A5' | 'LETTER' | 'LEGAL' | 'TABLOID';
export type PageOrientation = 'portrait' | 'landscape';
export type DocumentTheme = 'light' | 'dark' | 'system';

/** Page margins in centimetres. */
export type PageMargins = { top: number; right: number; bottom: number; left: number };

/**
 * Persisted page/layout configuration of a document. Mirrors the editor's page
 * setup (paper, orientation, background colour, margins) plus the per-document
 * light/dark/system theme. Kept as a framework-free value object.
 */
export type PageConfig = {
  paperSize: PaperSize;
  orientation: PageOrientation;
  /** Background colour of the page as a hex string (#rgb or #rrggbb). */
  pageColor: string;
  margins: PageMargins;
  documentTheme: DocumentTheme;
};

/** A partial patch: any field, and margins may be patched field-by-field. */
export type PageConfigPatch = Partial<Omit<PageConfig, 'margins'>> & {
  margins?: Partial<PageMargins>;
};

export const PAPER_SIZES: readonly PaperSize[] = ['A4', 'A3', 'A5', 'LETTER', 'LEGAL', 'TABLOID'];
export const PAGE_ORIENTATIONS: readonly PageOrientation[] = ['portrait', 'landscape'];
export const DOCUMENT_THEMES: readonly DocumentTheme[] = ['light', 'dark', 'system'];

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** The A4 portrait, white-background defaults used for new and legacy documents. */
export const DEFAULT_PAGE_CONFIG: PageConfig = {
  paperSize: 'A4',
  orientation: 'portrait',
  pageColor: '#ffffff',
  margins: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
  documentTheme: 'light',
};

function assertMargin(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new DomainError('invalid-page-config');
  return value;
}

/**
 * Merges a patch onto a base config, validating every field. Unknown enum
 * values, non-hex colours or negative/non-finite margins raise a DomainError.
 */
export function mergePageConfig(base: PageConfig, patch: PageConfigPatch): PageConfig {
  const next: PageConfig = { ...base, margins: { ...base.margins } };

  if (patch.paperSize !== undefined) {
    if (!PAPER_SIZES.includes(patch.paperSize)) throw new DomainError('invalid-page-config');
    next.paperSize = patch.paperSize;
  }
  if (patch.orientation !== undefined) {
    if (!PAGE_ORIENTATIONS.includes(patch.orientation))
      throw new DomainError('invalid-page-config');
    next.orientation = patch.orientation;
  }
  if (patch.documentTheme !== undefined) {
    if (!DOCUMENT_THEMES.includes(patch.documentTheme))
      throw new DomainError('invalid-page-config');
    next.documentTheme = patch.documentTheme;
  }
  if (patch.pageColor !== undefined) {
    if (!HEX_COLOR.test(patch.pageColor)) throw new DomainError('invalid-page-config');
    next.pageColor = patch.pageColor.toLowerCase();
  }
  if (patch.margins) {
    if (patch.margins.top !== undefined) next.margins.top = assertMargin(patch.margins.top);
    if (patch.margins.right !== undefined) next.margins.right = assertMargin(patch.margins.right);
    if (patch.margins.bottom !== undefined)
      next.margins.bottom = assertMargin(patch.margins.bottom);
    if (patch.margins.left !== undefined) next.margins.left = assertMargin(patch.margins.left);
  }

  return next;
}

/** Deep clones a config (margins is a nested object). */
export function clonePageConfig(config: PageConfig): PageConfig {
  return { ...config, margins: { ...config.margins } };
}
