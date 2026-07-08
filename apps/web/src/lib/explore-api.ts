import { apiFetch, apiFetchBlob, apiFetchStream } from './api-client';
import { parseSseStream } from './sse';

export type ExportFormat = 'pdf' | 'md';

/**
 * Exporta a resposta como PDF ou Markdown. O backend gera na hora e devolve os
 * bytes (efêmero — nada persistido). O conteúdo (markdown) vai no request.
 */
export function exportAnswer(input: {
  format: ExportFormat;
  title?: string;
  content: string;
}): Promise<Blob> {
  return apiFetchBlob('/explore/export', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Cliente da API de RAG generativo ("Explorar") do backend Nest. `POST /explore`
 * recupera trechos dos documentos/arquivos do usuário e gera uma resposta
 * ancorada, com as fontes citadas. Rota autenticada (Bearer + refresh no 401).
 * `POST /explore/stream` faz o mesmo em streaming (SSE), token a token.
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

/** Evento do streaming do Explorar (espelha o contrato do Nest). */
export type ExploreStreamEvent =
  | { type: 'status'; stage: 'queued' | 'retrieving' | 'generating'; position?: number }
  | { type: 'sources'; grounded: boolean; sources: ExploreSource[] }
  | { type: 'token'; text: string }
  | { type: 'done'; grounded: boolean }
  | { type: 'error'; message: string };

export function askExplore(q: string): Promise<ExploreAnswer> {
  return apiFetch<ExploreAnswer>('/explore', {
    method: 'POST',
    body: JSON.stringify({ q }),
  });
}

/** Streaming do Explorar: consome o SSE e emite os eventos já parseados. */
export async function* askExploreStream(
  q: string,
  signal?: AbortSignal,
): AsyncIterable<ExploreStreamEvent> {
  const res = await apiFetchStream('/explore/stream', {
    method: 'POST',
    body: JSON.stringify({ q }),
    signal,
  });
  yield* parseSseStream<ExploreStreamEvent>(res, signal);
}
