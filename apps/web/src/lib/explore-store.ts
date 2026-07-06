'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { askExplore } from './explore-api';

/**
 * Store da tela "Explorar" — busca híbrida + RAG sobre os documentos e arquivos
 * do usuário. `sendMessage` chama `POST /explore` (recuperação + geração no
 * serviço Python) e preenche `content`/`sources` com a resposta ancorada.
 *
 * Chats e mensagens ficam persistidos em localStorage (`mlp-explore`), então
 * "Recentes" e o histórico sobrevivem a reloads.
 */

export type ChatRole = 'user' | 'assistant';

/** Trecho de documento citado como fonte de uma resposta. */
export type ChatSource = {
  id: string;
  title: string;
  snippet: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sources?: ChatSource[];
  /** true enquanto a resposta do assistente está sendo "gerada". */
  pending?: boolean;
  createdAt: string;
};

export type Chat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

function titleFrom(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || 'Nova conversa';
}

type ExploreState = {
  chats: Chat[];
  activeId: string | null;
  sending: boolean;

  newChat: () => void;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  sendMessage: (text: string) => Promise<void>;
};

export const useExploreStore = create<ExploreState>()(
  persist(
    (set, get) => ({
      chats: [],
      activeId: null,
      sending: false,

      newChat: () => set({ activeId: null }),

      selectChat: (id) => set({ activeId: id }),

      deleteChat: (id) =>
        set((state) => {
          const chats = state.chats.filter((c) => c.id !== id);
          const activeId = state.activeId === id ? null : state.activeId;
          return { chats, activeId };
        }),

      sendMessage: async (text) => {
        const trimmed = text.trim();
        if (!trimmed || get().sending) return;

        const now = new Date().toISOString();
        const userMsg: ChatMessage = {
          id: uid(),
          role: 'user',
          content: trimmed,
          createdAt: now,
        };
        const pendingMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          content: '',
          pending: true,
          createdAt: now,
        };

        let chatId = get().activeId;

        set((state) => {
          if (chatId) {
            const chats = state.chats.map((c) =>
              c.id === chatId
                ? { ...c, messages: [...c.messages, userMsg, pendingMsg], updatedAt: now }
                : c,
            );
            return { chats, sending: true };
          }
          const created: Chat = {
            id: uid(),
            title: titleFrom(trimmed),
            messages: [userMsg, pendingMsg],
            createdAt: now,
            updatedAt: now,
          };
          chatId = created.id;
          return { chats: [created, ...state.chats], activeId: created.id, sending: true };
        });

        let content: string;
        let sources: ChatSource[] | undefined;
        try {
          const result = await askExplore(trimmed);
          content = result.answer;
          sources = result.sources.map((s) => ({
            id: `${s.documentId}-${s.snippet.slice(0, 12)}`,
            title: s.title,
            snippet: s.snippet,
          }));
        } catch {
          content = 'Não consegui responder agora. Tente novamente em instantes.';
          sources = undefined;
        }
        const doneAt = new Date().toISOString();

        set((state) => ({
          sending: false,
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  updatedAt: doneAt,
                  messages: c.messages.map((m) =>
                    m.id === pendingMsg.id
                      ? { ...m, content, sources, pending: false, createdAt: doneAt }
                      : m,
                  ),
                }
              : c,
          ),
        }));
      },
    }),
    {
      name: 'mlp-explore',
      partialize: (state) => ({ chats: state.chats, activeId: state.activeId }),
    },
  ),
);
