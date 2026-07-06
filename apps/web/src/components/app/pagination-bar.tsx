'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Barra de paginação compartilhada (Documentos / Arquivos / Mensagens).
 * Paginação client-side: o pai fatia a lista; aqui só mostramos o intervalo,
 * o seletor de itens por página e os controles anterior/próxima.
 */
export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground tabular-nums">
        {from}–{to} de {total}
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger
              size="sm"
              className="h-8 w-auto gap-1.5 text-xs"
              aria-label="Itens por página"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} por página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft />
          </Button>
          <span className="px-1 text-xs text-muted-foreground tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
