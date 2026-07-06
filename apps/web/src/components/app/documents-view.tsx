'use client';

import { FileText, Search, SquarePlus, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Doc, DocStatus } from '../../lib/documents-api';
import { useDocuments } from '../../lib/documents-store';
import { DocCard } from './doc-card';
import { PaginationBar } from './pagination-bar';

type StatusFilter = 'all' | DocStatus;

const PAGE_SIZES = [9, 18, 36];

function byNewest(a: Doc, b: Doc) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function DocumentsView() {
  const { documents } = useDocuments();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const counts = useMemo(
    () => ({
      all: documents.length,
      published: documents.filter((doc) => doc.status === 'published').length,
      draft: documents.filter((doc) => doc.status === 'draft').length,
    }),
    [documents],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents
      .filter((doc) => status === 'all' || doc.status === status)
      .filter(
        (doc) => !q || doc.title.toLowerCase().includes(q) || doc.excerpt.toLowerCase().includes(q),
      )
      .filter(
        (doc) =>
          activeCategories.length === 0 ||
          doc.categories.some((category) => activeCategories.includes(category)),
      )
      .sort(byNewest);
  }, [documents, query, status, activeCategories]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Volta pra página 1 quando os filtros mudam.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset ao filtrar
  useEffect(() => setPage(1), [query, status, activeCategories, pageSize]);
  // Não deixa a página passar do total (ex.: após apagar/despublicar).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function toggleCategory(category: string) {
    setActiveCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }

  function clearFilters() {
    setQuery('');
    setStatus('all');
    setActiveCategories([]);
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.all} {counts.all === 1 ? 'documento' : 'documentos'} — acessíveis por link.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/editor">
            <SquarePlus />
            Nova nota
          </Link>
        </Button>
      </div>

      {counts.all > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título ou conteúdo…"
              aria-label="Buscar documentos"
              className="pl-9"
            />
          </div>

          <Tabs value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">Todos · {counts.all}</TabsTrigger>
              <TabsTrigger value="published">Publicados · {counts.published}</TabsTrigger>
              <TabsTrigger value="draft">Rascunhos · {counts.draft}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {activeCategories.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Filtrando por:</span>
          {activeCategories.map((category) => (
            <Badge key={category} asChild variant="default">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                aria-label={`Remover filtro ${category}`}
                className="cursor-pointer font-normal"
              >
                {category}
                <X />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>
            Limpar
          </Button>
        </div>
      )}

      {counts.all === 0 ? (
        <EmptyState
          title="Nenhum documento ainda"
          description="Crie sua primeira nota — o título, o começo do texto e as categorias aparecem aqui."
          action={
            <Button asChild>
              <Link href="/app/editor">
                <SquarePlus />
                Nova nota
              </Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nada encontrado"
          description="Nenhum documento corresponde à busca e aos filtros atuais."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                activeCategories={activeCategories}
                onToggleCategory={toggleCategory}
              />
            ))}
          </div>
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
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileText className="size-5" />
      </span>
      <div>
        <p className="font-display font-medium">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-1">{action}</div>
    </div>
  );
}
