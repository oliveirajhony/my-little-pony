'use client';

import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PaginationPlus } from 'tiptap-pagination-plus';
import { EditorToolbar } from './editor-toolbar';
import { FloatingImage, type FloatingImageData } from './floating-image';
import { DEFAULT_GEOMETRY, readableTextColor } from './page-config';
import { ResizableImage } from './resizable-image';
import { usePageConfig } from './use-page-config';

export type ImageMode = 'inline' | 'floating';

const INITIAL_CONTENT = `
  <p><strong><span style="font-size: 30px">Documento sem título</span></strong></p>
  <p>Comece a escrever aqui. Use a barra acima para formatar: fonte, tamanho, cor, alinhamento, listas e mais — e insira imagens para arrastar onde quiser.</p>
`;

export function DocumentEditor() {
  const [images, setImages] = useState<FloatingImageData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Height of the paginated flow — keeps floating images inside the document bounds.
  const [flowHeight, setFlowHeight] = useState(DEFAULT_GEOMETRY.height);
  const nextImageId = useRef(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, underline: false }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      TextAlign.configure({ types: ['paragraph'] }),
      Highlight.configure({ multicolor: true }),
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
  });

  const { config, updateConfig, geometry } = usePageConfig(editor);

  // Measure the paginated flow so floating images can't be dragged off the document.
  useEffect(() => {
    const el = editor?.view.dom as HTMLElement | undefined;
    if (!el) return;
    const observer = new ResizeObserver(() => setFlowHeight(el.scrollHeight));
    observer.observe(el);
    setFlowHeight(el.scrollHeight);
    return () => observer.disconnect();
  }, [editor]);

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

  const pageStyle = {
    '--page-bg': config.pageColor,
    '--page-fg': readableTextColor(config.pageColor),
  } as CSSProperties;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <EditorToolbar
        editor={editor}
        pageConfig={config}
        onPageConfigChange={updateConfig}
        onInsertImage={insertImage}
      />

      <div
        className="editor-desk min-h-0 flex-1 overflow-auto rounded-xl border p-3 sm:p-6 md:p-10"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null);
        }}
      >
        <div className="relative mx-auto w-fit" style={pageStyle}>
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
  );
}
