import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PublishedDoc } from '../../../../components/published/published-doc';
import { getPublicDocument } from '../../../../lib/documents-api';

type PageParams = { ownerId: string; slug: string };

/**
 * `cache()` deduplica a busca dentro do mesmo request: `generateMetadata` e a
 * página compartilham o resultado sem refazer o fetch.
 */
const loadDoc = cache(getPublicDocument);

/**
 * Metadata por documento: título na aba do navegador e tags Open Graph para o
 * preview ao compartilhar o link. Favicons e ícones são herdados do layout raiz.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { ownerId, slug } = await params;
  const doc = await loadDoc(ownerId, slug);
  if (!doc) return { title: 'Documento não encontrado · my-little-pony' };

  const description = doc.excerpt || undefined;
  return {
    title: `${doc.title} · my-little-pony`,
    description,
    openGraph: {
      title: doc.title,
      description,
      type: 'article',
    },
  };
}

/**
 * Página pública de um documento publicado. Renderiza no servidor a partir do
 * backend (`GET /public/documents/:ownerId/:slug`); slug inexistente ou de
 * rascunho cai no 404.
 */
export default async function PublishedDocPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { ownerId, slug } = await params;
  const doc = await loadDoc(ownerId, slug);
  if (!doc) notFound();
  return <PublishedDoc doc={doc} ownerId={ownerId} />;
}
