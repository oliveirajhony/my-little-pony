'use client';

import { ArrowUpDown, Eye, Inbox, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { fullDate, relativeDate } from '../../lib/format-date';
import type { ContactMessage } from '../../lib/messages-api';
import { useMessages, useMessagesStore } from '../../lib/messages-store';
import { PaginationBar } from './pagination-bar';

type StatusFilter = 'all' | 'unread' | 'read';
type SortKey = 'recent' | 'oldest' | 'unread-first';

const PAGE_SIZES = [10, 25, 50];

const SORT_LABEL: Record<SortKey, string> = {
  recent: 'Mais recentes',
  oldest: 'Mais antigas',
  'unread-first': 'Não lidas primeiro',
};

const SORTERS: Record<SortKey, (a: ContactMessage, b: ContactMessage) => number> = {
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  'unread-first': (a, b) =>
    Number(!!a.readAt) - Number(!!b.readAt) || b.createdAt.localeCompare(a.createdAt),
};

export function MessagesView() {
  const { items, hydrated } = useMessages();
  const markRead = useMessagesStore((s) => s.markRead);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const counts = useMemo(() => {
    const unread = items.filter((m) => !m.readAt).length;
    return { all: items.length, unread, read: items.length - unread };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((m) => status === 'all' || (status === 'unread' ? !m.readAt : !!m.readAt))
      .filter(
        (m) =>
          !q ||
          m.fromName.toLowerCase().includes(q) ||
          m.fromEmail.toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q),
      )
      .sort(SORTERS[sort]);
  }, [items, query, status, sort]);

  const hasActiveFilter = query.trim() !== '' || status !== 'all' || sort !== 'recent';
  const open = items.find((m) => m.id === openId) ?? null;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset ao filtrar
  useEffect(() => setPage(1), [query, status, sort, pageSize]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function onOpen(message: ContactMessage) {
    setOpenId(message.id);
    if (!message.readAt) void markRead(message.id);
  }

  function clearFilters() {
    setQuery('');
    setStatus('all');
    setSort('recent');
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Mensagens</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recebidas pelo "Fale com a gente" dos seus documentos publicados.
        </p>
      </header>

      {!hydrated ? (
        <SkeletonList />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, e-mail ou mensagem…"
                aria-label="Buscar mensagens"
                className="pl-9"
              />
            </div>

            <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <TabsList>
                <TabsTrigger value="all">Todas · {counts.all}</TabsTrigger>
                <TabsTrigger value="unread">Não lidas · {counts.unread}</TabsTrigger>
                <TabsTrigger value="read">Lidas · {counts.read}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filtered.length === 0 ? (
            <NoResults onClear={clearFilters} />
          ) : (
            <>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilter
                    ? `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`
                    : ''}
                </p>
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger
                    size="sm"
                    className="w-auto gap-1.5"
                    aria-label="Ordenar mensagens"
                  >
                    <ArrowUpDown className="size-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {SORT_LABEL[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tabela (≥ md) */}
              <div className="mt-3 hidden overflow-hidden rounded-xl border md:block">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="w-10 py-3 pl-4" aria-label="Situação" />
                      <th className="w-[22%] py-3 pr-3">Remetente</th>
                      <th className="hidden w-[24%] py-3 pr-3 lg:table-cell">E-mail</th>
                      <th className="py-3 pr-3">Mensagem</th>
                      <th className="w-28 py-3 pr-3">Recebida</th>
                      <th className="w-12 py-3 pr-2" aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((m) => (
                      <MessageRow key={m.id} message={m} onOpen={() => onOpen(m)} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards (< md) */}
              <ul className="mt-3 space-y-2 md:hidden">
                {paged.map((m) => (
                  <li key={m.id}>
                    <MessageCard message={m} onOpen={() => onOpen(m)} />
                  </li>
                ))}
              </ul>

              <PaginationBar
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={PAGE_SIZES}
              />
            </>
          )}
        </>
      )}

      <ReaderDialog message={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

/* --------------------------------- Table row ------------------------------ */

function MessageRow({ message, onOpen }: { message: ContactMessage; onOpen: () => void }) {
  const unread = !message.readAt;
  return (
    <tr
      onClick={onOpen}
      className={cn(
        'group cursor-pointer border-b align-middle transition-colors last:border-b-0',
        unread ? 'bg-primary/[0.03] hover:bg-primary/[0.06]' : 'hover:bg-accent/40',
      )}
    >
      <td className="py-3 pl-4">
        <span
          className={cn('block size-2 rounded-full', unread ? 'bg-primary' : 'bg-transparent')}
          aria-hidden
        />
        <span className="sr-only">{unread ? 'Não lida' : 'Lida'}</span>
      </td>
      <td className="py-3 pr-3">
        <span className={cn('block truncate', unread && 'font-medium')}>{message.fromName}</span>
      </td>
      <td className="hidden py-3 pr-3 text-muted-foreground lg:table-cell">
        <span className="block truncate">{message.fromEmail}</span>
      </td>
      <td className="py-3 pr-3 text-muted-foreground">
        <span className="block truncate">{message.message}</span>
      </td>
      <td className="py-3 pr-3 text-xs text-muted-foreground">
        <time dateTime={message.createdAt} title={fullDate(message.createdAt)}>
          {relativeDate(message.createdAt)}
        </time>
      </td>
      <td className="py-3 pr-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          aria-label={`Visualizar mensagem de ${message.fromName}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <Eye />
        </Button>
      </td>
    </tr>
  );
}

/* ----------------------------------- Card --------------------------------- */

function MessageCard({ message, onOpen }: { message: ContactMessage; onOpen: () => void }) {
  const unread = !message.readAt;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-colors',
        unread ? 'border-primary/40 bg-primary/[0.03]' : 'hover:bg-accent/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2">
          {unread && <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
          <span className={cn('truncate', unread && 'font-medium')}>{message.fromName}</span>
        </p>
        <time
          dateTime={message.createdAt}
          title={fullDate(message.createdAt)}
          className="shrink-0 text-xs text-muted-foreground"
        >
          {relativeDate(message.createdAt)}
        </time>
      </div>
      <p className="mt-1 truncate text-sm text-muted-foreground">{message.fromEmail}</p>
      <p className="mt-2 line-clamp-2 text-sm text-foreground/90">{message.message}</p>
    </button>
  );
}

/* ------------------------------- Reader dialog ---------------------------- */

function ReaderDialog({
  message,
  onClose,
}: {
  message: ContactMessage | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={message !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {message && (
          <>
            <DialogHeader>
              <DialogTitle>{message.fromName}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-1.5">
                <a href={`mailto:${message.fromEmail}`} className="text-primary hover:underline">
                  {message.fromEmail}
                </a>
                <span aria-hidden>·</span>
                <time dateTime={message.createdAt}>{fullDate(message.createdAt)}</time>
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[50svh]">
              <p className="max-w-prose whitespace-pre-wrap pr-3 text-sm leading-relaxed text-foreground/90">
                {message.message}
              </p>
            </ScrollArea>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Fechar
              </Button>
              <Button asChild>
                <a
                  href={`mailto:${message.fromEmail}?subject=${encodeURIComponent('Re: seu contato')}`}
                >
                  Responder
                </a>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- States (empty etc.) ------------------------- */

function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-5" />
      </span>
      <div>
        <p className="font-display font-medium">Nenhuma mensagem ainda</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Quando alguém escrever pela página pública de um documento, aparece aqui.
        </p>
      </div>
    </div>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Search className="size-5" />
      </span>
      <div>
        <p className="font-display font-medium">Nada encontrado</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Nenhuma mensagem corresponde à busca e aos filtros.
        </p>
      </div>
      <div className="mt-1">
        <Button variant="outline" onClick={onClear}>
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="mt-6 space-y-3">
      <Skeleton className="h-9 w-full max-w-xs" />
      <div className="overflow-hidden rounded-xl border">
        {Array.from({ length: 5 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders estáticos
          <div key={i} className="flex items-center gap-3 border-b p-4 last:border-b-0">
            <Skeleton className="size-2 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
