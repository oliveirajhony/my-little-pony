'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import {
  type DocStatus,
  type DocSummary,
  deleteDocument,
  listDocuments,
  publishDocument,
  unpublishDocument,
} from './documents-api';

/**
 * Store da lista de documentos da área logada. Os dados vêm do backend
 * (`GET /documents`); as ações de card (apagar/publicar) chamam a API e
 * atualizam o estado local, sem recarregar a lista inteira. O editor faz
 * suas próprias chamadas e usa `upsert` para refletir a mudança aqui.
 */

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60);
  return slug || 'documento';
}

type DocumentsState = {
  documents: DocSummary[];
  status: LoadStatus;
  /** Carrega a lista uma vez (no-op se já carregada ou carregando). */
  load: () => Promise<void>;
  /** Recarrega a lista incondicionalmente. */
  refresh: () => Promise<void>;
  removeDoc: (id: string) => Promise<void>;
  setStatus: (id: string, status: DocStatus) => Promise<void>;
  /** Insere/atualiza um documento na lista (usado pelo editor após salvar). */
  upsert: (doc: DocSummary) => void;
};

export const useDocumentsStore = create<DocumentsState>()((set, get) => ({
  documents: [],
  status: 'idle',

  load: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      const { items } = await listDocuments();
      set({ documents: items, status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },

  refresh: async () => {
    try {
      const { items } = await listDocuments();
      set({ documents: items, status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },

  removeDoc: async (id) => {
    await deleteDocument(id);
    set((state) => ({ documents: state.documents.filter((doc) => doc.id !== id) }));
  },

  setStatus: async (id, status) => {
    const updated =
      status === 'published' ? await publishDocument(id) : await unpublishDocument(id);
    set((state) => ({
      documents: state.documents.map((doc) => (doc.id === id ? updated : doc)),
    }));
  },

  upsert: (doc) =>
    set((state) => {
      const exists = state.documents.some((d) => d.id === doc.id);
      const documents = exists
        ? state.documents.map((d) => (d.id === doc.id ? doc : d))
        : [doc, ...state.documents];
      return { documents };
    }),
}));

/**
 * Assina a lista e dispara o carregamento inicial no mount. `hydrated` vira
 * true assim que a primeira carga resolve (com dados ou erro), para os
 * consumidores saberem que já não é um estado vazio transitório.
 */
export function useDocuments() {
  const documents = useDocumentsStore((state) => state.documents);
  const status = useDocumentsStore((state) => state.status);

  useEffect(() => {
    void useDocumentsStore.getState().load();
  }, []);

  return { documents, hydrated: status === 'ready' || status === 'error' };
}
