'use client';

import { type NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { type PointerEvent as ReactPointerEvent, useRef } from 'react';
import { cn } from '@/lib/utils';

export function ResizableImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const resize = useRef<{ px: number; ow: number } | null>(null);
  const width = node.attrs.width as number | null;
  const editable = editor.isEditable;

  function start(event: ReactPointerEvent) {
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    resize.current = { px: event.clientX, ow: width ?? 240 };
  }
  function move(event: ReactPointerEvent) {
    if (!resize.current) return;
    const next = Math.max(48, Math.round(resize.current.ow + (event.clientX - resize.current.px)));
    updateAttributes({ width: next });
  }
  function end(event: ReactPointerEvent) {
    resize.current = null;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  return (
    <NodeViewWrapper as="span" className="relative inline-block leading-none">
      {/* biome-ignore lint/performance/noImgElement: inline resizable document image */}
      <img
        src={node.attrs.src}
        alt={node.attrs.alt || 'imagem'}
        draggable={false}
        style={{ width: width ? `${width}px` : undefined }}
        className={cn(
          'inline-block max-w-full rounded-md align-bottom',
          selected && editable && 'outline-2 outline-primary',
        )}
      />
      {selected && editable ? (
        <span
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          className="absolute -right-1 -bottom-1 size-3 cursor-nwse-resize rounded-full border-2 border-primary bg-background"
        />
      ) : null}
    </NodeViewWrapper>
  );
}
