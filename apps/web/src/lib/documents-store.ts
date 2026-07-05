'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { type Doc, documents as seedDocuments } from './mock-data';

/**
 * Client-side document store. Seeded from the mock data and persisted to
 * localStorage, so the editor can create/update documents that show up on the
 * Documentos screen and survive a reload.
 *
 * This is the single seam the real backend will replace: swap the store's
 * actions for API calls and every consumer keeps working unchanged.
 */

const EXCERPT_LENGTH = 180;

export type SaveDocInput = {
  id?: string;
  title: string;
  content: string;
  text: string;
  categories: string[];
  slug?: string;
  status?: Doc['status'];
};

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

function makeExcerpt(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= EXCERPT_LENGTH) return clean;
  return `${clean.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `doc-${Date.now()}`;
}

type DocumentsState = {
  documents: Doc[];
  saveDoc: (input: SaveDocInput) => string;
  removeDoc: (id: string) => void;
  setStatus: (id: string, status: Doc['status']) => void;
};

export const useDocumentsStore = create<DocumentsState>()(
  persist(
    (set) => ({
      documents: seedDocuments,

      saveDoc: ({ id, title, content, text, categories, slug, status }) => {
        const trimmedTitle = title.trim() || 'Documento sem título';
        const excerpt = makeExcerpt(text) || 'Documento em branco.';
        const docId = id ?? newId();

        set((state) => {
          const existing = state.documents.find((doc) => doc.id === docId);
          const next: Doc = {
            id: docId,
            title: trimmedTitle,
            excerpt,
            categories,
            content,
            status: status ?? existing?.status ?? 'draft',
            slug: slug?.trim() ? slugify(slug) : slugify(trimmedTitle),
            updatedAt: today(),
          };
          const documents = existing
            ? state.documents.map((doc) => (doc.id === docId ? next : doc))
            : [next, ...state.documents];
          return { documents };
        });

        return docId;
      },

      removeDoc: (id) =>
        set((state) => ({ documents: state.documents.filter((doc) => doc.id !== id) })),

      setStatus: (id, status) =>
        set((state) => ({
          documents: state.documents.map((doc) => (doc.id === id ? { ...doc, status } : doc)),
        })),
    }),
    {
      name: 'mlp.documents',
      storage: createJSONStorage(() => localStorage),
      // We rehydrate manually after mount so server and first client render both
      // use the seed data — avoids hydration mismatches.
      skipHydration: true,
    },
  ),
);

export function getDocById(id: string): Doc | undefined {
  return useDocumentsStore.getState().documents.find((doc) => doc.id === id);
}

/**
 * Subscribe to the documents and trigger the one-time localStorage rehydration.
 * `hydrated` flips to true once the persisted state is loaded — use it when you
 * need the *real* data (e.g. loading a document by id) rather than the seed.
 */
export function useDocuments() {
  const documents = useDocumentsStore((state) => state.documents);
  // Start false on both server and client so the first render matches; the
  // effect (client only) reads/loads the persisted state after mount.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const { persist: persistApi } = useDocumentsStore;
    if (persistApi.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = persistApi.onFinishHydration(() => setHydrated(true));
    persistApi.rehydrate();
    return unsub;
  }, []);

  return { documents, hydrated };
}
