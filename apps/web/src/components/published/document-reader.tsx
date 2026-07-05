'use client';

import { EditorContent } from '@tiptap/react';
import { type CSSProperties, useEffect, useState } from 'react';
import '../app/editor/editor.css';
import { DEFAULT_GEOMETRY } from '../app/editor/page-config';
import { useReaderEditor } from './use-reader-editor';

type Props = {
  content: string;
  /** Fator de zoom (1 = 100%). */
  zoom?: number;
  /** Reporta a quantidade de folhas (para indicador/navegação). */
  onPageCount?: (count: number) => void;
};

/**
 * Leitor inline: renderiza o documento em folhas A4 paginadas (somente
 * leitura), centralizadas, com zoom. O footprint é reservado em escala para o
 * scroll acompanhar o zoom, como no editor.
 */
export function DocumentReader({ content, zoom = 1, onPageCount }: Props) {
  const editor = useReaderEditor(content);
  const [flowHeight, setFlowHeight] = useState(DEFAULT_GEOMETRY.height);

  useEffect(() => {
    const el = editor?.view.dom as HTMLElement | undefined;
    if (!el) return;
    const measure = () => {
      setFlowHeight(el.scrollHeight);
      const pages = el.querySelector('[data-rm-pagination]')?.children.length ?? 1;
      onPageCount?.(pages);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [editor, onPageCount]);

  const pageStyle = {
    transform: `scale(${zoom})`,
    transformOrigin: 'top center',
  } as CSSProperties;

  return (
    <div
      className="mlp-doc-footprint mx-auto"
      style={{ width: DEFAULT_GEOMETRY.width * zoom, height: flowHeight * zoom }}
    >
      <div className="mlp-doc-pages w-full" style={pageStyle}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
