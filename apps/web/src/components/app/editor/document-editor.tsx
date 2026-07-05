'use client';

import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { PaginationPlus } from 'tiptap-pagination-plus';
import { EditorToolbar } from './editor-toolbar';
import { FloatingImage, type FloatingImageData } from './floating-image';
import { ResizableImage } from './resizable-image';

export type ImageMode = 'inline' | 'floating';

export type Orientation = 'portrait' | 'landscape';

// A4 at 96dpi.
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
// Word / Google-Docs default page margin (~1 inch @ 96dpi).
const PAGE_MARGIN = 96;

const INITIAL_CONTENT = `
  <p><strong><span style="font-size: 30px">Documento sem título</span></strong></p>
  <p>Comece a escrever aqui. Use a barra acima para formatar: fonte, tamanho, cor, alinhamento, listas e mais — e insira imagens para arrastar onde quiser.</p>
`;

let nextImageId = 0;

export function DocumentEditor() {
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [pageBg, setPageBg] = useState('#ffffff');
  const [images, setImages] = useState<FloatingImageData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Height of the paginated flow — keeps floating images inside the document bounds.
  const [flowHeight, setFlowHeight] = useState(A4_HEIGHT);

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
      PaginationPlus.configure({
        pageWidth: A4_WIDTH,
        pageHeight: A4_HEIGHT,
        pageGap: 28,
        // Gap fill; the theme-aware desk color is enforced via editor.css.
        pageBreakBackground: '#e8eaef',
        pageGapBorderSize: 0,
        pageGapBorderColor: 'transparent',
        marginTop: PAGE_MARGIN,
        marginBottom: PAGE_MARGIN,
        marginLeft: PAGE_MARGIN,
        marginRight: PAGE_MARGIN,
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

  const pageWidth = orientation === 'portrait' ? A4_WIDTH : A4_HEIGHT;

  // Drive the page size from the orientation toggle (portrait ↔ landscape).
  useEffect(() => {
    if (!editor) return;
    const portrait = orientation === 'portrait';
    editor.commands.updatePageWidth(portrait ? A4_WIDTH : A4_HEIGHT);
    editor.commands.updatePageHeight(portrait ? A4_HEIGHT : A4_WIDTH);
  }, [editor, orientation]);

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
          .setImage({ src, width: w, aspect } as { src: string })
          .run();
        return;
      }
      const id = ++nextImageId;
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <EditorToolbar
        editor={editor}
        orientation={orientation}
        onOrientationChange={setOrientation}
        onInsertImage={insertImage}
        onPageBgChange={setPageBg}
      />

      <div
        className="editor-desk min-h-0 flex-1 overflow-auto rounded-xl border p-6 md:p-10"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null);
        }}
      >
        <div className="relative mx-auto w-fit" style={{ ['--page-bg' as string]: pageBg }}>
          <EditorContent editor={editor} />

          {images.map((image) => (
            <FloatingImage
              key={image.id}
              data={image}
              selected={selectedId === image.id}
              bounds={{ w: pageWidth, h: flowHeight }}
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
