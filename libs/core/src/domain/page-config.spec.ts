import { DomainError } from './errors.js';
import { DEFAULT_PAGE_CONFIG, mergePageConfig } from './page-config.js';

describe('mergePageConfig', () => {
  it('keeps the base config when the patch is empty', () => {
    expect(mergePageConfig(DEFAULT_PAGE_CONFIG, {})).toEqual(DEFAULT_PAGE_CONFIG);
  });

  it('patches a single field without touching the rest', () => {
    const next = mergePageConfig(DEFAULT_PAGE_CONFIG, { orientation: 'landscape' });
    expect(next.orientation).toBe('landscape');
    expect(next.paperSize).toBe('A4');
    expect(next.margins).toEqual(DEFAULT_PAGE_CONFIG.margins);
  });

  it('patches margins field-by-field', () => {
    const next = mergePageConfig(DEFAULT_PAGE_CONFIG, { margins: { left: 1 } });
    expect(next.margins).toEqual({ top: 2.5, right: 2, bottom: 2.5, left: 1 });
  });

  it('normalises the page colour to lowercase', () => {
    expect(mergePageConfig(DEFAULT_PAGE_CONFIG, { pageColor: '#0F172A' }).pageColor).toBe(
      '#0f172a',
    );
  });

  it('does not mutate the base config', () => {
    const base = { ...DEFAULT_PAGE_CONFIG, margins: { ...DEFAULT_PAGE_CONFIG.margins } };
    mergePageConfig(base, { margins: { top: 9 } });
    expect(base.margins.top).toBe(2.5);
  });

  it('rejects an unknown paper size', () => {
    expect(() => mergePageConfig(DEFAULT_PAGE_CONFIG, { paperSize: 'B5' as never })).toThrow(
      DomainError,
    );
  });

  it('rejects a non-hex page colour', () => {
    expect(() => mergePageConfig(DEFAULT_PAGE_CONFIG, { pageColor: 'blue' })).toThrow(DomainError);
  });

  it('rejects a negative margin', () => {
    expect(() => mergePageConfig(DEFAULT_PAGE_CONFIG, { margins: { top: -1 } })).toThrow(
      DomainError,
    );
  });
});
