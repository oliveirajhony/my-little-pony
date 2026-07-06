import { type HTMLElement, type Node, NodeType, parse } from 'node-html-parser';
import { HEX_COLOR, type HeadingLevel, type TextAlign } from './editor-schema';

/** Inline formatting marks that can apply to a run of text. */
export type Marks = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  highlight?: string;
};

/** A contiguous span of text sharing the same marks. */
export type Run = { text: string; marks?: Marks };

export type Block =
  | { type: 'paragraph'; runs: Run[]; align?: TextAlign; lineHeight?: string }
  | { type: 'heading'; level: HeadingLevel; runs: Run[]; align?: TextAlign; lineHeight?: string }
  | { type: 'bulletList'; items: Run[][] }
  | { type: 'orderedList'; items: Run[][] }
  | { type: 'horizontalRule' }
  | { type: 'image'; src: string; alt?: string; width?: number };

const MARK_KEYS: (keyof Marks)[] = [
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'fontFamily',
  'fontSize',
  'highlight',
];

function hasMarks(marks: Marks): boolean {
  return MARK_KEYS.some((k) => marks[k] !== undefined && marks[k] !== false);
}

function marksEqual(a: Marks | undefined, b: Marks | undefined): boolean {
  const x = a ?? {};
  const y = b ?? {};
  return MARK_KEYS.every((k) => x[k] === y[k]);
}

function cleanMarks(marks: Marks): Marks | undefined {
  const out: Marks = {};
  for (const k of MARK_KEYS) {
    const v = marks[k];
    if (v !== undefined && v !== false) (out as Record<string, unknown>)[k] = v;
  }
  return hasMarks(out) ? out : undefined;
}

/** Merges adjacent runs with identical marks (keeps the model compact). */
function coalesce(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const run of runs) {
    if (run.text.length === 0) continue;
    const last = out[out.length - 1];
    if (last && marksEqual(last.marks, run.marks)) last.text += run.text;
    else out.push({ text: run.text, marks: run.marks });
  }
  return out;
}

function parseStyle(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const key = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (key && value) out[key] = value;
  }
  return out;
}

function applyElementMarks(el: HTMLElement, inherited: Marks): Marks {
  const marks: Marks = { ...inherited };
  const tag = el.rawTagName?.toLowerCase();
  if (tag === 'strong' || tag === 'b') marks.bold = true;
  if (tag === 'em' || tag === 'i') marks.italic = true;
  if (tag === 'u') marks.underline = true;
  if (tag === 's' || tag === 'strike' || tag === 'del') marks.strike = true;
  if (tag === 'mark') {
    const style = parseStyle(el.getAttribute('style') ?? '');
    marks.highlight = style['background-color'] ?? style.background ?? '#fef08a';
  }
  const style = parseStyle(el.getAttribute('style') ?? '');
  if (style.color && HEX_COLOR.test(style.color)) marks.color = style.color.toLowerCase();
  if (style['background-color'] && tag !== 'mark' && HEX_COLOR.test(style['background-color'])) {
    marks.highlight = style['background-color'].toLowerCase();
  }
  if (style['font-family']) marks.fontFamily = style['font-family'].replace(/["']/g, '').trim();
  if (style['font-size']) marks.fontSize = style['font-size'].trim();
  return marks;
}

/** Collects the inline runs under a node, threading marks down the tree. */
function collectRuns(node: Node, inherited: Marks, out: Run[]): void {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = node.rawText.replace(/\s+/g, ' ');
    if (text) out.push({ text, marks: cleanMarks(inherited) });
    return;
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.rawTagName?.toLowerCase();
  if (tag === 'br') {
    out.push({ text: '\n', marks: cleanMarks(inherited) });
    return;
  }
  const marks = applyElementMarks(el, inherited);
  for (const child of el.childNodes) collectRuns(child, marks, out);
}

function runsOf(el: HTMLElement): Run[] {
  const runs: Run[] = [];
  for (const child of el.childNodes) collectRuns(child, {}, runs);
  return coalesce(runs);
}

function alignOf(el: HTMLElement): TextAlign | undefined {
  const style = parseStyle(el.getAttribute('style') ?? '');
  const value = (style['text-align'] ?? el.getAttribute('data-text-align') ?? '').toLowerCase();
  if (value === 'left' || value === 'center' || value === 'right' || value === 'justify') {
    return value;
  }
  return undefined;
}

function lineHeightOf(el: HTMLElement): string | undefined {
  const style = parseStyle(el.getAttribute('style') ?? '');
  return style['line-height'] || undefined;
}

function listItems(list: HTMLElement): Run[][] {
  return list.childNodes
    .filter(
      (n): n is HTMLElement =>
        n.nodeType === NodeType.ELEMENT_NODE &&
        (n as HTMLElement).rawTagName?.toLowerCase() === 'li',
    )
    .map((li) => runsOf(li));
}

/** Parses sanitised HTML into the flat block model used by the structured tools. */
export function htmlToBlocks(html: string): Block[] {
  const root = parse(html, { blockTextElements: {} });
  const blocks: Block[] = [];
  for (const node of root.childNodes) {
    if (node.nodeType !== NodeType.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    const tag = el.rawTagName?.toLowerCase();
    switch (tag) {
      case 'p':
        blocks.push({
          type: 'paragraph',
          runs: runsOf(el),
          align: alignOf(el),
          lineHeight: lineHeightOf(el),
        });
        break;
      case 'h1':
      case 'h2':
      case 'h3':
        blocks.push({
          type: 'heading',
          level: Number(tag[1]) as HeadingLevel,
          runs: runsOf(el),
          align: alignOf(el),
          lineHeight: lineHeightOf(el),
        });
        break;
      case 'ul':
        blocks.push({ type: 'bulletList', items: listItems(el) });
        break;
      case 'ol':
        blocks.push({ type: 'orderedList', items: listItems(el) });
        break;
      case 'hr':
        blocks.push({ type: 'horizontalRule' });
        break;
      case 'img': {
        const width = Number(el.getAttribute('width'));
        blocks.push({
          type: 'image',
          src: el.getAttribute('src') ?? '',
          alt: el.getAttribute('alt') || undefined,
          width: Number.isFinite(width) && width > 0 ? width : undefined,
        });
        break;
      }
      default:
        break;
    }
  }
  return blocks;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderRun(run: Run): string {
  let html = escapeHtml(run.text).replace(/\n/g, '<br>');
  const m = run.marks;
  if (!m) return html;
  const styles: string[] = [];
  if (m.color) styles.push(`color: ${m.color}`);
  if (m.fontFamily) styles.push(`font-family: ${m.fontFamily}`);
  if (m.fontSize) styles.push(`font-size: ${m.fontSize}`);
  if (styles.length) html = `<span style="${styles.join('; ')}">${html}</span>`;
  if (m.highlight) html = `<mark style="background-color: ${m.highlight}">${html}</mark>`;
  if (m.underline) html = `<u>${html}</u>`;
  if (m.strike) html = `<s>${html}</s>`;
  if (m.italic) html = `<em>${html}</em>`;
  if (m.bold) html = `<strong>${html}</strong>`;
  return html;
}

function renderRuns(runs: Run[]): string {
  const inner = runs.map(renderRun).join('');
  return inner || '';
}

function blockStyle(align?: TextAlign, lineHeight?: string): string {
  const styles: string[] = [];
  if (align) styles.push(`text-align: ${align}`);
  if (lineHeight) styles.push(`line-height: ${lineHeight}`);
  return styles.length ? ` style="${styles.join('; ')}"` : '';
}

/** Serialises the block model back to Tiptap-compatible HTML. */
export function blocksToHtml(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        parts.push(`<p${blockStyle(block.align, block.lineHeight)}>${renderRuns(block.runs)}</p>`);
        break;
      case 'heading': {
        const tag = `h${block.level}`;
        parts.push(
          `<${tag}${blockStyle(block.align, block.lineHeight)}>${renderRuns(block.runs)}</${tag}>`,
        );
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        const tag = block.type === 'bulletList' ? 'ul' : 'ol';
        const items = block.items.map((runs) => `<li>${renderRuns(runs)}</li>`).join('');
        parts.push(`<${tag}>${items}</${tag}>`);
        break;
      }
      case 'horizontalRule':
        parts.push('<hr>');
        break;
      case 'image': {
        const width = block.width ? ` width="${block.width}"` : '';
        parts.push(
          `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt ?? '')}"${width}>`,
        );
        break;
      }
    }
  }
  return parts.join('');
}

/** True for blocks that hold inline runs (paragraph/heading). */
export function isTextBlock(block: Block): block is Extract<Block, { runs: Run[] }> {
  return block.type === 'paragraph' || block.type === 'heading';
}

/**
 * Applies marks to the [from, to) character range of a text block's runs.
 * Setting a mark to false/undefined removes it. Offsets are clamped to the text.
 */
export function applyMarksToRange(runs: Run[], from: number, to: number, patch: Marks): Run[] {
  const chars: { ch: string; marks: Marks }[] = [];
  for (const run of runs) {
    for (const ch of run.text) chars.push({ ch, marks: { ...(run.marks ?? {}) } });
  }
  const start = Math.max(0, Math.min(from, chars.length));
  const end = Math.max(start, Math.min(to, chars.length));
  for (let i = start; i < end; i += 1) {
    const marks = chars[i].marks;
    for (const key of MARK_KEYS) {
      if (key in patch) {
        const value = patch[key];
        if (value === undefined || value === false) delete marks[key];
        else (marks as Record<string, unknown>)[key] = value;
      }
    }
  }
  return coalesce(chars.map((c) => ({ text: c.ch, marks: cleanMarks(c.marks) })));
}

/** Flattens a text block's runs to plain text (for previews / offsets). */
export function runsToText(runs: Run[]): string {
  return runs.map((r) => r.text).join('');
}
