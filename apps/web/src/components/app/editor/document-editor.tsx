'use client';

import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PaginationPlus } from 'tiptap-pagination-plus';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditorToolbar } from './editor-toolbar';
import { FloatingImage, type FloatingImageData } from './floating-image';
import { LineHeight } from './line-height';
import { DEFAULT_GEOMETRY, readableTextColor } from './page-config';
import { ResizableImage } from './resizable-image';
import { usePageConfig } from './use-page-config';

export type ImageMode = 'inline' | 'floating';

const INITIAL_CONTENT = '<p></p>';

const ZOOM_LEVELS = [
  { value: 'fit', label: 'Ajustar' },
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1', label: '100%' },
  { value: '1.25', label: '125%' },
  { value: '1.5', label: '150%' },
];

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function DocumentEditor() {
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<FloatingImageData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Height of the paginated flow — keeps floating images inside the document bounds.
  const [flowHeight, setFlowHeight] = useState(DEFAULT_GEOMETRY.height);
  const [zoom, setZoom] = useState('1');
  const [deskWidth, setDeskWidth] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [wordCount, setWordCount] = useState(0);
  const nextImageId = useRef(0);
  const deskRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, underline: false }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      LineHeight.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Comece a escrever…' }),
      ResizableImage.configure({ inline: true, allowBase64: true }),
      // Real A4 pagination: content reflows across pages, like Word / Google Docs.
      // Size and margins are then driven by usePageConfig (single source of truth).
      PaginationPlus.configure({
        pageWidth: DEFAULT_GEOMETRY.width,
        pageHeight: DEFAULT_GEOMETRY.height,
        pageGap: 28,
        // Gap fill; the theme-aware desk color is enforced via editor.css.
        pageBreakBackground: '#e8eaef',
        pageGapBorderSize: 0,
        pageGapBorderColor: 'transparent',
        marginTop: DEFAULT_GEOMETRY.margins.top,
        marginBottom: DEFAULT_GEOMETRY.margins.bottom,
        marginLeft: DEFAULT_GEOMETRY.margins.left,
        marginRight: DEFAULT_GEOMETRY.margins.right,
        contentMarginTop: 0,
        contentMarginBottom: 0,
        // Clean pages — no default page numbers / headers / footers.
        headerLeft: '',
        headerRight: '',
        footerLeft: '',
        footerRight: '',
      }),
    ],
    content: INITIAL_CONTENT,
    editorProps: {
      attributes: { class: 'tiptap' },
    },
    onCreate: ({ editor: e }) => setWordCount(countWords(e.getText())),
    onUpdate: ({ editor: e }) => setWordCount(countWords(e.getText())),
  });

  const { config, updateConfig, geometry } = usePageConfig(editor);

  // Measure the paginated flow (floating-image bounds) and the page count.
  useEffect(() => {
    const el = editor?.view.dom as HTMLElement | undefined;
    if (!el) return;
    const measure = () => {
      setFlowHeight(el.scrollHeight);
      setPageCount(el.querySelector('[data-rm-pagination]')?.children.length ?? 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [editor]);

  // Track the available desk width so "Ajustar" (fit) can size the page to it.
  useEffect(() => {
    const el = deskRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      setDeskWidth(
        el.clientWidth - Number.parseFloat(cs.paddingLeft) - Number.parseFloat(cs.paddingRight),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, []);

  function insertImage(src: string, mode: ImageMode) {
    const probe = new window.Image();
    probe.onload = () => {
      const w = Math.min(360, probe.naturalWidth || 360);
      const aspect = probe.naturalWidth / probe.naturalHeight || 1;
      if (mode === 'inline') {
        // Pass the aspect so the node reserves its height up front and pagination
        // stays correct even before the image finishes loading.
        editor
          ?.chain()
          .focus()
          .insertContent({ type: 'image', attrs: { src, width: w, aspect } })
          .run();
        return;
      }
      nextImageId.current += 1;
      const id = nextImageId.current;
      setImages((prev) => [...prev, { id, src, x: 120, y: 140, w, aspect }]);
      setSelectedId(id);
    };
    probe.src = src;
  }

  function updateImage(id: number, patch: Partial<FloatingImageData>) {
    setImages((prev) => prev.map((image) => (image.id === id ? { ...image, ...patch } : image)));
  }

  function removeImage(id: number) {
    setImages((prev) => prev.filter((image) => image.id !== id));
    setSelectedId(null);
  }

  // "Ajustar" scales the page to the desk width; otherwise use the chosen level.
  const zoomValue =
    zoom === 'fit' ? (deskWidth > 0 ? Math.max(0.2, deskWidth / geometry.width) : 1) : Number(zoom);

  const pageStyle = {
    '--page-bg': config.pageColor,
    '--page-fg': readableTextColor(config.pageColor),
    // scale for display only — pagination still measures the unscaled layout.
    transform: `scale(${zoomValue})`,
    transformOrigin: 'top left',
  } as CSSProperties;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Documento sem título"
        aria-label="Título do documento"
        className="w-full truncate bg-transparent px-1 font-display text-xl font-semibold outline-none placeholder:text-muted-foreground/50"
      />

      <EditorToolbar
        editor={editor}
        pageConfig={config}
        onPageConfigChange={updateConfig}
        onInsertImage={insertImage}
      />

      <div
        ref={deskRef}
        className="editor-desk min-h-0 flex-1 overflow-auto rounded-xl border p-3 sm:p-6 md:p-10"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null);
        }}
      >
        {/* Reserves the scaled footprint so the scroll area matches the zoom. */}
        <div
          className="mx-auto"
          style={{ width: geometry.width * zoomValue, height: flowHeight * zoomValue }}
        >
          <div className="relative w-fit" style={pageStyle}>
            <EditorContent editor={editor} />

            {images.map((image) => (
              <FloatingImage
                key={image.id}
                data={image}
                selected={selectedId === image.id}
                bounds={{ w: geometry.width, h: flowHeight }}
                onSelect={() => setSelectedId(image.id)}
                onChange={(patch) => updateImage(image.id, patch)}
                onRemove={() => removeImage(image.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-30 flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-1.5 text-muted-foreground text-xs">
        <span>
          {pageCount} {pageCount === 1 ? 'página' : 'páginas'} · {wordCount}{' '}
          {wordCount === 1 ? 'palavra' : 'palavras'}
        </span>
        <div className="flex items-center gap-2">
          <span>Zoom</span>
          <Select value={zoom} onValueChange={setZoom}>
            <SelectTrigger size="sm" className="h-7 w-[104px]" aria-label="Zoom">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZOOM_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
