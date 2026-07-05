import { PublishedDoc } from '../../../components/published/published-doc';
import { PublishedDocFallback } from '../../../components/published/published-doc-fallback';
import { findPublishedDoc } from '../../../lib/mock-data';

export default async function PublishedDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = findPublishedDoc(slug);

  // Docs-semente renderizam no servidor (compartilháveis por qualquer pessoa);
  // o resto tenta o store local no cliente.
  if (doc) return <PublishedDoc doc={doc} />;
  return <PublishedDocFallback slug={slug} />;
}
