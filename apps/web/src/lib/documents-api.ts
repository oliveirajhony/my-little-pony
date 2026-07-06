/**
 * Cliente da API de documentos do backend Nest. Esta é a fronteira que
 * substitui o antigo store em localStorage: tipos + chamadas HTTP.
 *
 * - Rotas autenticadas (`/documents/*`) usam `apiFetch` (Bearer + refresh no 401).
 * - A leitura pública (`/public/documents/:ownerId/:slug`) é anônima e roda no
 *   servidor (SSR), então usa `fetch` direto na `API_INTERNAL_BASE` (rede Docker).
 */

import { API_INTERNAL_BASE, apiFetch } from './api-client';

export type DocStatus = 'draft' | 'published';

/** Projeção de lista/card — sem o conteúdo pesado. */
export type DocSummary = {
  id: string;
  title: string;
  slug: string;
  status: DocStatus;
  excerpt: string;
  categories: string[];
  indexStatus: string;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
};

/** Configuração de página/tema persistida do documento (espelha o backend). */
export type PageConfigDto = {
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  pageColor: string;
  margins: { top: number; right: number; bottom: number; left: number };
  documentTheme: 'light' | 'dark' | 'system';
};

/** Documento completo (editor) — inclui o HTML e a configuração de página. */
export type DocDetail = DocSummary & { content: string; pageConfig: PageConfigDto };

/**
 * Forma usada pela UI da área logada (cards + editor). O conteúdo é opcional
 * porque a lista não o traz; o editor sempre busca o detalhe.
 */
export type Doc = DocSummary & { content?: string };

/** Documento publicado, servido publicamente (anônimo, com cache no backend). */
export type PublicDoc = {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  categories: string[];
  publishedAt: string | null;
  updatedAt: string;
};

type DocListResponse = { items: DocSummary[]; total: number; page: number; limit: number };

const MAX_LIST = 100;

/** Lista os documentos do usuário (primeira página, mais recentes primeiro). */
export function listDocuments(): Promise<DocListResponse> {
  return apiFetch<DocListResponse>(`/documents?limit=${MAX_LIST}`);
}

/** Documento completo (com conteúdo) para edição. */
export function getDocument(id: string): Promise<DocDetail> {
  return apiFetch<DocDetail>(`/documents/${id}`);
}

/** Cria um rascunho e devolve o documento (id + versão inicial). */
export function createDocument(title?: string): Promise<DocDetail> {
  return apiFetch<DocDetail>('/documents', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export type SaveDocumentInput = {
  version: number;
  title?: string;
  content?: string;
  slug?: string;
  categories?: string[];
  pageConfig?: Partial<PageConfigDto>;
};

/** Autosave com concorrência otimista por versão. */
export function saveDocument(id: string, input: SaveDocumentInput): Promise<DocDetail> {
  return apiFetch<DocDetail>(`/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteDocument(id: string): Promise<void> {
  return apiFetch<void>(`/documents/${id}`, { method: 'DELETE' });
}

/** Publica (gera slug único por autor) e devolve o resumo atualizado. */
export function publishDocument(id: string): Promise<DocSummary> {
  return apiFetch<DocSummary>(`/documents/${id}/publish`, { method: 'POST' });
}

/** Despublica (volta a rascunho). */
export function unpublishDocument(id: string): Promise<DocSummary> {
  return apiFetch<DocSummary>(`/documents/${id}/unpublish`, { method: 'POST' });
}

/**
 * Leitura pública de um documento publicado, por autor + slug. Roda no servidor
 * (sem token). Devolve `null` em 404/erro para a página cair no `notFound`.
 */
export async function getPublicDocument(ownerId: string, slug: string): Promise<PublicDoc | null> {
  const res = await fetch(
    `${API_INTERNAL_BASE}/public/documents/${encodeURIComponent(ownerId)}/${encodeURIComponent(slug)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) return null;
  return (await res.json()) as PublicDoc;
}
