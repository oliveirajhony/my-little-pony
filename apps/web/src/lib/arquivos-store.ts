'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { deleteArquivo, type ImportedFile, importArquivo, listArquivos } from './arquivos-api';

/**
 * Store da lista de documentos-fonte da tela "Arquivos". Os dados vêm do backend
 * Nest (`GET /source-files`); importar/apagar chamam a API e atualizam o estado
 * local sem recarregar a lista inteira. (Antes era mock em localStorage/IndexedDB.)
 */

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

type ArquivosState = {
  files: ImportedFile[];
  status: LoadStatus;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  importFiles: (files: File[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeMany: (ids: string[]) => Promise<void>;
};

export const useArquivosStore = create<ArquivosState>()((set, get) => ({
  files: [],
  status: 'idle',

  load: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      set({ files: await listArquivos(), status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },

  refresh: async () => {
    try {
      set({ files: await listArquivos(), status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },

  importFiles: async (incoming) => {
    const imported = await Promise.all(incoming.map((file) => importArquivo(file)));
    set((state) => ({ files: [...imported, ...state.files] }));
  },

  remove: async (id) => {
    await deleteArquivo(id);
    set((state) => ({ files: state.files.filter((f) => f.id !== id) }));
  },

  removeMany: async (ids) => {
    await Promise.all(ids.map((id) => deleteArquivo(id)));
    const drop = new Set(ids);
    set((state) => ({ files: state.files.filter((f) => !drop.has(f.id)) }));
  },
}));

/** Assina a lista e dispara o carregamento inicial no mount. */
export function useArquivos() {
  const files = useArquivosStore((s) => s.files);
  const status = useArquivosStore((s) => s.status);

  useEffect(() => {
    void useArquivosStore.getState().load();
  }, []);

  return { files, hydrated: status === 'ready' || status === 'error' };
}
