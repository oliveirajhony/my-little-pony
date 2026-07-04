'use client';

import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { useState } from 'react';
import { EditorToolbar } from './editor-toolbar';

export type Orientation = 'portrait' | 'landscape';

// A4 at 96dpi.
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

const INITIAL_CONTENT = `
  <h1>Documento sem título</h1>
  <p>Comece a escrever aqui. Use a barra acima para formatar: fonte, tamanho, cor, alinhamento, listas e mais.</p>
`;

export function DocumentEditor() {
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [pageBg, setPageBg] = useState('#ffffff');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: INITIAL_CONTENT,
    editorProps: {
      attributes: { class: 'tiptap' },
    },
  });

  const width = orientation === 'portrait' ? A4_WIDTH : A4_HEIGHT;
  const minHeight = orientation === 'portrait' ? A4_HEIGHT : A4_WIDTH;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <EditorToolbar
        editor={editor}
        orientation={orientation}
        onOrientationChange={setOrientation}
        onPageBgChange={setPageBg}
      />

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-muted/40 p-6 md:p-10">
        <div
          className="mx-auto cursor-text shadow-lg ring-1 ring-black/5"
          style={{ width, minHeight, background: pageBg }}
        >
          <div className="px-16 py-[72px]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
