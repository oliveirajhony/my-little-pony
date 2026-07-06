import { applyMarksToRange, blocksToHtml, htmlToBlocks, runsToText } from './block-model';
import { contentService } from './content-service';
import { sanitizeContentHtml } from './sanitize';

describe('sanitizeContentHtml', () => {
  it('strips script tags and event handlers', () => {
    const dirty = '<p onclick="steal()">oi</p><script>alert(1)</script>';
    const clean = sanitizeContentHtml(dirty);
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('oi');
  });

  it('keeps allowed marks and alignment', () => {
    const clean = sanitizeContentHtml('<p style="text-align: center"><strong>x</strong></p>');
    expect(clean).toContain('text-align:center');
    expect(clean).toContain('<strong>x</strong>');
  });

  it('drops disallowed inline styles', () => {
    const clean = sanitizeContentHtml('<span style="position: fixed; color: #ff0000">x</span>');
    expect(clean).not.toContain('position');
    expect(clean).toContain('color:#ff0000');
  });
});

describe('htmlToBlocks / blocksToHtml round-trip', () => {
  it('parses a paragraph with bold and colour into runs', () => {
    const blocks = htmlToBlocks('<p>oi <strong>mundo</strong></p>');
    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    if (block.type !== 'paragraph') throw new Error('expected paragraph');
    expect(runsToText(block.runs)).toBe('oi mundo');
    expect(block.runs[1].marks?.bold).toBe(true);
  });

  it('parses heading level and alignment', () => {
    const blocks = htmlToBlocks('<h2 style="text-align: right">Título</h2>');
    const block = blocks[0];
    if (block.type !== 'heading') throw new Error('expected heading');
    expect(block.level).toBe(2);
    expect(block.align).toBe('right');
  });

  it('parses bullet lists into items', () => {
    const blocks = htmlToBlocks('<ul><li>um</li><li>dois</li></ul>');
    const block = blocks[0];
    if (block.type !== 'bulletList') throw new Error('expected bulletList');
    expect(block.items.map((i) => runsToText(i))).toEqual(['um', 'dois']);
  });

  it('round-trips a document back to equivalent HTML', () => {
    const html = '<h1>Guia</h1><p>Texto <em>enfático</em>.</p><hr>';
    const blocks = htmlToBlocks(html);
    const out = blocksToHtml(blocks);
    expect(out).toContain('<h1>Guia</h1>');
    expect(out).toContain('<em>enfático</em>');
    expect(out).toContain('<hr>');
  });
});

describe('applyMarksToRange', () => {
  it('bolds a character range and splits runs', () => {
    const runs = [{ text: 'abcdef' }];
    const next = applyMarksToRange(runs, 2, 4, { bold: true });
    expect(runsToText(next)).toBe('abcdef');
    expect(next.find((r) => r.text === 'cd')?.marks?.bold).toBe(true);
    expect(next.find((r) => r.text === 'ab')?.marks).toBeUndefined();
  });

  it('removes a mark when set to false', () => {
    const runs = [{ text: 'hi', marks: { bold: true } }];
    const next = applyMarksToRange(runs, 0, 2, { bold: false });
    expect(next[0].marks).toBeUndefined();
  });
});

describe('contentService', () => {
  it('normalises markdown to sanitised html', () => {
    const html = contentService.normalize('# Olá\n\nmundo **forte**', 'markdown');
    expect(html).toContain('<h1>Olá</h1>');
    expect(html).toContain('<strong>forte</strong>');
  });

  it('normalises and sanitises html input', () => {
    const html = contentService.normalize('<p>oi</p><script>x</script>', 'html');
    expect(html).toBe('<p>oi</p>');
  });

  it('converts stored html to markdown', () => {
    expect(contentService.toMarkdown('<h1>Oi</h1>')).toContain('# Oi');
  });
});
