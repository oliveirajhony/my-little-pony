import { notFound } from 'next/navigation';
import { PublishedDoc } from '../../../../components/published/published-doc';
import { getPublicDocument } from '../../../../lib/documents-api';

/**
 * Página pública de um documento publicado. Renderiza no servidor a partir do
 * backend (`GET /public/documents/:ownerId/:slug`); slug inexistente ou de
 * rascunho cai no 404.
 */
export default async function PublishedDocPage({
  params,
}: {
  params: Promise<{ ownerId: string; slug: string }>;
}) {
  const { ownerId, slug } = await params;
  const doc = await getPublicDocument(ownerId, slug);
  if (!doc) notFound();
  return <PublishedDoc doc={doc} ownerId={ownerId} />;
}
