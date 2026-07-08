import { apiFetch } from './api-client';

/**
 * Cliente da Busca semântica. `GET /search?q=` recupera trechos relevantes dos
 * documentos e arquivos do usuário (mesmo backend do Explorar; ownerId vem do
 * JWT). Degrada para `[]` quando o serviço de busca não está configurado.
 */
export type SearchResult = {
  documentId: string;
  score: number;
  snippet: string;
  kind: 'native' | 'file';
  title: string;
  slug: string | null;
};

export function searchDocuments(q: string): Promise<SearchResult[]> {
  return apiFetch<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`);
}
