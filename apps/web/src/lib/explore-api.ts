import { apiFetch } from './api-client';

/**
 * Cliente da API de RAG generativo ("Explorar") do backend Nest. `POST /explore`
 * recupera trechos dos documentos/arquivos do usuário e gera uma resposta
 * ancorada, com as fontes citadas. Rota autenticada (Bearer + refresh no 401).
 */

export type ExploreSource = {
  documentId: string;
  score: number;
  snippet: string;
  kind: 'native' | 'file';
  title: string;
  slug: string | null;
};

export type ExploreAnswer = {
  answer: string;
  grounded: boolean;
  sources: ExploreSource[];
};

export function askExplore(q: string): Promise<ExploreAnswer> {
  return apiFetch<ExploreAnswer>('/explore', {
    method: 'POST',
    body: JSON.stringify({ q }),
  });
}
