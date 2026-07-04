'use client';

import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { useState } from 'react';
import { EditorToolbar } from './editor-toolbar';
import { FloatingImage, type FloatingImageData } from './floating-image';
import { ResizableImage } from './resizable-image';

export type ImageMode = 'inline' | 'floating';

export type Orientation = 'portrait' | 'landscape';

// A4 at 96dpi.
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

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
    ],
    content: INITIAL_CONTENT,
    editorProps: {
      attributes: { class: 'tiptap' },
    },
  });

  const width = orientation === 'portrait' ? A4_WIDTH : A4_HEIGHT;
  const minHeight = orientation === 'portrait' ? A4_HEIGHT : A4_WIDTH;

  function insertImage(src: string, mode: ImageMode) {
    const probe = new window.Image();
    probe.onload = () => {
      const w = Math.min(360, probe.naturalWidth || 360);
      if (mode === 'inline') {
        editor
          ?.chain()
          .focus()
          .setImage({ src, width: w } as { src: string })
          .run();
        return;
      }
      const id = ++nextImageId;
      const aspect = probe.naturalWidth / probe.naturalHeight || 1;
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

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-muted/40 p-6 md:p-10">
        <div
          className="relative mx-auto shadow-lg ring-1 ring-black/5"
          style={{ width, minHeight, background: pageBg }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          <div className="px-16 py-[72px]">
            <EditorContent editor={editor} />
          </div>

          {images.map((image) => (
            <FloatingImage
              key={image.id}
              data={image}
              selected={selectedId === image.id}
              bounds={{ w: width, h: minHeight }}
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
