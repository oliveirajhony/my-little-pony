'use client';

import { notFound } from 'next/navigation';
import { useDocuments } from '../../lib/documents-store';
import { PublishedDoc } from './published-doc';

/**
 * Quando o slug não é um documento-semente, tenta o store local (localStorage)
 * — permite pré-visualizar, no mesmo navegador, docs criados no editor. Se nada
 * for encontrado após a hidratação, cai no 404.
 */
export function PublishedDocFallback({ slug }: { slug: string }) {
  const { documents, hydrated } = useDocuments();

  if (!hydrated) {
    return (
      <div className="grid min-h-svh place-items-center bg-background text-sm text-muted-foreground">
        Carregando documento…
      </div>
    );
  }

  const doc = documents.find((d) => d.slug === slug && d.status === 'published');
  if (!doc) notFound();

  return <PublishedDoc doc={doc} />;
}
