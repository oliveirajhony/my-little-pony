import { DomainError } from './errors.js';
import { kindFromFilename, SourceFile } from './source-file.js';

const now = new Date('2026-07-06T00:00:00.000Z');

function make(overrides: Partial<Parameters<typeof SourceFile.create>[0]> = {}) {
  return SourceFile.create({
    id: 'f1',
    ownerId: 'u1',
    filename: 'contrato.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1234,
    now,
    ...overrides,
  });
}

describe('kindFromFilename', () => {
  it('maps supported extensions (case-insensitive)', () => {
    expect(kindFromFilename('a.PDF')).toBe('pdf');
    expect(kindFromFilename('a.docx')).toBe('docx');
    expect(kindFromFilename('a.doc')).toBe('doc');
    expect(kindFromFilename('a.md')).toBe('md');
    expect(kindFromFilename('a.markdown')).toBe('md');
    expect(kindFromFilename('a.html')).toBe('html');
    expect(kindFromFilename('a.htm')).toBe('html');
  });

  it('returns null for unsupported or missing extensions', () => {
    expect(kindFromFilename('a.txt')).toBeNull();
    expect(kindFromFilename('a.png')).toBeNull();
    expect(kindFromFilename('noext')).toBeNull();
  });
});

describe('SourceFile.create', () => {
  it('creates a file, deriving the kind and trimming the filename', () => {
    const file = make({ filename: '  relatorio.DOCX  ' });
    expect(file.id).toBe('f1');
    expect(file.ownerId).toBe('u1');
    expect(file.filename).toBe('relatorio.DOCX');
    expect(file.kind).toBe('docx');
    expect(file.sizeBytes).toBe(1234);
    expect(file.createdAt).toEqual(now);
  });

  it('rejects an empty filename', () => {
    expect(() => make({ filename: '   ' })).toThrow(DomainError);
  });

  it('rejects an unsupported extension', () => {
    expect(() => make({ filename: 'planilha.xlsx' })).toThrow(DomainError);
  });

  it('rejects a non-positive size', () => {
    expect(() => make({ sizeBytes: 0 })).toThrow(DomainError);
    expect(() => make({ sizeBytes: -1 })).toThrow(DomainError);
  });

  it('tracks ownership', () => {
    const file = make();
    expect(file.isOwnedBy('u1')).toBe(true);
    expect(file.isOwnedBy('u2')).toBe(false);
  });
});
