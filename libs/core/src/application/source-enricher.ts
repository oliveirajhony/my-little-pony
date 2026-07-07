import type { DocumentRepository, SearchHit, SourceFileRepository, SourceKind } from './ports.js';
import type { SearchResultItem } from './search-use-cases.js';

/**
 * Enriquecimento de hits com o metadado da fonte do dono, compartilhado por
 * SearchDocuments e AnswerQuestion. Além de DRY, centraliza a **re-checagem de
 * posse** (`isOwnedBy`): mesmo que o serviço Python devolva uma fonte de outro
 * tenant, ela é descartada aqui — a garantia multi-tenant não pode divergir
 * entre busca e explorar.
 */

type Repos = { documents: DocumentRepository; files: SourceFileRepository };

function base(hit: SearchHit, kind: SourceKind): Omit<SearchResultItem, 'title' | 'slug'> {
  return { documentId: hit.documentId, score: hit.score, snippet: hit.snippet, kind };
}

async function enrichOne(
  hit: SearchHit,
  ownerId: string,
  { documents, files }: Repos,
): Promise<SearchResultItem | null> {
  if (hit.kind === 'file') {
    const file = await files.findById(hit.documentId);
    if (!file?.isOwnedBy(ownerId)) return null;
    return { ...base(hit, 'file'), title: file.filename, slug: null };
  }
  const doc = await documents.findById(hit.documentId);
  if (!doc?.isOwnedBy(ownerId)) return null;
  return { ...base(hit, 'native'), title: doc.title, slug: doc.slug };
}

/**
 * Enriquece hits em PARALELO (cada lookup é independente), preservando a ordem
 * e descartando fontes não possuídas. Antes era um `for await` sequencial — K
 * hits = K round-trips em série.
 */
export async function enrichSources(
  hits: SearchHit[],
  ownerId: string,
  repos: Repos,
): Promise<SearchResultItem[]> {
  const enriched = await Promise.all(hits.map((hit) => enrichOne(hit, ownerId, repos)));
  return enriched.filter((item): item is SearchResultItem => item !== null);
}
