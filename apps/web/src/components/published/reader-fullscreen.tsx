'use client';

import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { prefersReducedMotion } from '../../lib/prefers-reduced-motion';
import { DEFAULT_GEOMETRY } from '../app/editor/page-config';
import { DocumentReader } from './document-reader';

const GAP = 28;
const PAD_TOP = 32;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.75;

type Props = {
  content: string;
  title: string;
  onClose: () => void;
};

/**
 * Modo tela cheia: só o documento, uma folha por vez com navegação animada
 * (setas + teclado), zoom e fechar com Esc. Reaproveita o DocumentReader.
 */
export function ReaderFullscreen({ content, title, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const stride = (DEFAULT_GEOMETRY.height + GAP) * zoom;

  const goTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(pageCount - 1, target));
      setPage(clamped);
      scrollRef.current?.scrollTo({
        top: PAD_TOP + clamped * stride,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    },
    [pageCount, stride],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          goTo(page + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          goTo(page - 1);
          break;
        case '+':
        case '=':
          setZoom((z) => Math.min(MAX_ZOOM, z + 0.25));
          break;
        case '-':
          setZoom((z) => Math.max(MIN_ZOOM, z - 0.25));
          break;
        case 'Escape':
          onClose();
          break;
      }
    },
    [page, goTo, onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onKeyDown]);

  // Mantém o indicador em sincronia se o usuário rolar manualmente.
  function onScroll() {
    const top = scrollRef.current?.scrollTop ?? 0;
    setPage(Math.max(0, Math.min(pageCount - 1, Math.round((top - PAD_TOP) / stride))));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-4">
        <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Diminuir zoom"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.25))}
          >
            <Minus />
          </Button>
          <span className="w-12 text-center font-mono text-xs text-muted-foreground tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Aumentar zoom"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.25))}
          >
            <Plus />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Fechar tela cheia" onClick={onClose}>
            <X />
          </Button>
        </div>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="mlp-scrollbar flex-1 overflow-auto">
        <div className="py-8">
          <DocumentReader content={content} zoom={zoom} onPageCount={setPageCount} />
        </div>
      </div>

      <nav className="pointer-events-none absolute inset-x-0 bottom-6 flex items-center justify-center gap-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border bg-card/90 px-2 py-1.5 shadow-lg backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            aria-label="Página anterior"
            disabled={page <= 0}
            onClick={() => goTo(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-14 text-center font-mono text-xs tabular-nums">
            {page + 1} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            aria-label="Próxima página"
            disabled={page >= pageCount - 1}
            onClick={() => goTo(page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </nav>
    </div>
  );
}
