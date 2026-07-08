'use client';

import { FileText, Loader2, Paperclip, Search, SearchX } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type SearchResult, searchDocuments } from '../../lib/search-api';

type Status = 'idle' | 'loading' | 'done' | 'error';

/** Onde o resultado abre: doc nativo → editor; arquivo importado → preview. */
function resultHref(r: SearchResult): string {
  return r.kind === 'file'
    ? `/app/arquivos?file=${r.documentId}`
    : `/app/editor?id=${r.documentId}`;
}

export function BuscaView() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q || status === 'loading') return;
    setStatus('loading');
    setSearched(q);
    try {
      const hits = await searchDocuments(q);
      setResults(hits);
      setStatus('done');
    } catch {
      setResults([]);
      setStatus('error');
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-3.5rem)] w-full max-w-2xl flex-col px-4">
      <form onSubmit={submit} className="pt-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nos seus documentos e arquivos…"
              aria-label="Buscar"
              autoFocus
              className="h-11 pl-9 text-base"
            />
          </div>
          <Button type="submit" className="h-11" disabled={!query.trim() || status === 'loading'}>
            Buscar
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Busca por significado nos seus documentos publicados e arquivos importados.
        </p>
      </form>

      <ScrollArea className="min-h-0 flex-1">
        <div className="py-6">
          {status === 'idle' && <Hint />}
          {status === 'loading' && <LoadingState />}
          {status === 'error' && <Message icon={SearchX} text="Busca indisponível no momento." />}
          {status === 'done' &&
            (results.length === 0 ? (
              <Message icon={SearchX} text={`Nada encontrado para "${searched}".`} />
            ) : (
              <Results results={results} />
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function Results({ results }: { results: SearchResult[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs text-muted-foreground">
        {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
      </p>
      {results.map((r) => {
        const Icon = r.kind === 'file' ? Paperclip : FileText;
        return (
          <Link
            key={`${r.documentId}-${r.snippet.slice(0, 40)}`}
            href={resultHref(r)}
            className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5 no-underline transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{r.snippet}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function Hint() {
  return (
    <Message
      icon={Search}
      text="Digite e pressione Enter para buscar por significado — não só por título."
    />
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Buscando…
    </div>
  );
}

function Message({ icon: Icon, text }: { icon: typeof Search; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
      <Icon className="size-5" />
      <p className="max-w-sm">{text}</p>
    </div>
  );
}
