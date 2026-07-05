'use client';

import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { PaginationPlus } from 'tiptap-pagination-plus';
import { LineHeight } from '../app/editor/line-height';
import { DEFAULT_GEOMETRY } from '../app/editor/page-config';
import { ResizableImage } from '../app/editor/resizable-image';

/**
 * Editor TipTap em modo somente-leitura, com a MESMA geometria/paginação A4 do
 * editor — assim a página publicada renderiza as folhas idênticas ao que o
 * autor vê. Retorna o editor (ou null antes de montar).
 */
export function useReaderEditor(content: string) {
  return useEditor({
    editable: false,
    immediatelyRender: false,
    content,
    editorProps: { attributes: { class: 'tiptap' } },
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
      ResizableImage.configure({ inline: true, allowBase64: true }),
      PaginationPlus.configure({
        pageWidth: DEFAULT_GEOMETRY.width,
        pageHeight: DEFAULT_GEOMETRY.height,
        pageGap: 28,
        pageBreakBackground: '#e8eaef',
        pageGapBorderSize: 0,
        pageGapBorderColor: 'transparent',
        marginTop: DEFAULT_GEOMETRY.margins.top,
        marginBottom: DEFAULT_GEOMETRY.margins.bottom,
        marginLeft: DEFAULT_GEOMETRY.margins.left,
        marginRight: DEFAULT_GEOMETRY.margins.right,
        contentMarginTop: 0,
        contentMarginBottom: 0,
        headerLeft: '',
        headerRight: '',
        footerLeft: '',
        footerRight: '',
      }),
    ],
  });
}
