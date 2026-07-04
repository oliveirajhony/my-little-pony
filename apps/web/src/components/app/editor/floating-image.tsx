'use client';

import { X } from 'lucide-react';
import { type PointerEvent as ReactPointerEvent, useRef } from 'react';
import { cn } from '@/lib/utils';

export type FloatingImageData = {
  id: number;
  src: string;
  x: number;
  y: number;
  w: number;
  aspect: number;
};

type Props = {
  data: FloatingImageData;
  selected: boolean;
  bounds: { w: number; h: number };
  onSelect: () => void;
  onChange: (patch: Partial<FloatingImageData>) => void;
  onRemove: () => void;
};

const MIN_WIDTH = 48;

export function FloatingImage({ data, selected, bounds, onSelect, onChange, onRemove }: Props) {
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const resize = useRef<{ px: number; ow: number } | null>(null);
  const height = data.w / data.aspect;

  function startDrag(event: ReactPointerEvent) {
    event.preventDefault();
    onSelect();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { px: event.clientX, py: event.clientY, ox: data.x, oy: data.y };
  }
  function moveDrag(event: ReactPointerEvent) {
    if (!drag.current) return;
    const nx = drag.current.ox + (event.clientX - drag.current.px);
    const ny = drag.current.oy + (event.clientY - drag.current.py);
    onChange({
      x: Math.max(0, Math.min(bounds.w - data.w, nx)),
      y: Math.max(0, Math.min(bounds.h - height, ny)),
    });
  }
  function endDrag(event: ReactPointerEvent) {
    drag.current = null;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  function startResize(event: ReactPointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    resize.current = { px: event.clientX, ow: data.w };
  }
  function moveResize(event: ReactPointerEvent) {
    if (!resize.current) return;
    const nw = resize.current.ow + (event.clientX - resize.current.px);
    onChange({ w: Math.max(MIN_WIDTH, Math.min(bounds.w - data.x, nw)) });
  }
  function endResize(event: ReactPointerEvent) {
    resize.current = null;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  return (
    <div
      className={cn(
        'absolute select-none rounded-md',
        selected
          ? 'outline-2 outline-primary'
          : 'outline-1 outline-transparent hover:outline-primary/40',
      )}
      style={{ left: data.x, top: data.y, width: data.w, height }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {/* biome-ignore lint/performance/noImgElement: free-positioned draggable image on the document canvas */}
      <img
        src={data.src}
        alt="Imagem do documento"
        draggable={false}
        className="block size-full cursor-move rounded-md"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
      />

      {selected ? (
        <>
          <button
            type="button"
            aria-label="Redimensionar"
            onPointerDown={startResize}
            onPointerMove={moveResize}
            onPointerUp={endResize}
            className="absolute -right-1.5 -bottom-1.5 size-3.5 cursor-nwse-resize rounded-full border-2 border-primary bg-background"
          />
          <button
            type="button"
            aria-label="Remover imagem"
            onClick={onRemove}
            className="absolute -top-2.5 -right-2.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow"
          >
            <X className="size-3" />
          </button>
        </>
      ) : null}
    </div>
  );
}
