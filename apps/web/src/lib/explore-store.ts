'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { askExploreStream, type ExploreSource } from './explore-api';

/**
 * Store da tela "Explorar" — busca híbrida + RAG sobre os documentos e arquivos
 * do usuário. `sendMessage` consome `POST /explore/stream` (SSE) e preenche a
 * bolha do assistente token a token: etapa → fontes → texto ao vivo.
 *
 * Chats e mensagens ficam persistidos em localStorage (`mlp-explore`), então
 * "Recentes" e o histórico sobrevivem a reloads (mensagens em voo NÃO são
 * persistidas — ver `withoutPendingMessages`).
 */

export type ChatRole = 'user' | 'assistant';

/** Trecho de documento citado como fonte de uma resposta. */
export type ChatSource = {
  id: string;
  title: string;
  snippet: string;
};

/** Etapa visível da geração (antes/durante os tokens). */
export type StreamStage = 'queued' | 'retrieving' | 'generating';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sources?: ChatSource[];
  /** true enquanto a resposta do assistente está sendo gerada. */
  pending?: boolean;
  /** true enquanto tokens estão chegando (distingue "gerando" de "enfileirado"). */
  streaming?: boolean;
  /** etapa atual do pipeline, para o indicador de progresso. */
  stage?: StreamStage;
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

const STUCK_ANSWER = 'Não consegui responder agora. Tente novamente em instantes.';
// Coalesce de tokens: aplica o buffer ao estado no máximo a cada ~60ms para não
// re-renderizar a árvore a cada token (mantém o typing suave sem travar).
const FLUSH_MS = 60;

function toSources(list: ExploreSource[]): ChatSource[] {
  // Inclui o índice na key: dois chunks do mesmo doc com o mesmo início de snippet
  // (heading/boilerplate comum) colidiriam senão.
  return list.map((s, i) => ({
    id: `${s.documentId}-${i}`,
    title: s.title,
    snippet: s.snippet,
  }));
}

/**
 * Remove mensagens em voo antes de persistir: um reload no meio de uma resposta
 * deixaria a bolha travada para sempre (e congelaria um parcial de streaming).
 */
export function withoutPendingMessages(chats: Chat[]): Chat[] {
  return chats.map((c) => ({
    ...c,
    messages: c.messages.filter((m) => !m.pending && !m.streaming),
  }));
}

/**
 * Rede de segurança para estado persistido por versões anteriores (que ainda
 * pode conter `pending`/`streaming`): converte a bolha travada num erro claro.
 */
export function repairPendingMessages(chats: Chat[]): Chat[] {
  return chats.map((c) => ({
    ...c,
    messages: c.messages.map((m) =>
      m.pending || m.streaming
        ? {
            ...m,
            pending: false,
            streaming: false,
            stage: undefined,
            content: m.content || STUCK_ANSWER,
          }
        : m,
    ),
  }));
}

// Estado efêmero da geração atual (fora do zustand: não persiste, não re-renderiza).
let abortRef: AbortController | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let tokenBuffer = '';
let streamingChatId: string | null = null; // qual chat está recebendo o stream
let streamingActive = false; // trava a persistência durante o streaming

// Storage que NÃO grava enquanto o stream corre: a mensagem em voo é excluída pelo
// partialize de qualquer forma, então re-serializar o histórico a cada flush (~60ms)
// só gera jank. A gravação final acontece quando streamingActive volta a false.
const guardedStorage = createJSONStorage(() => {
  if (typeof window === 'undefined') return undefined as unknown as Storage;
  return {
    getItem: (k) => window.localStorage.getItem(k),
    setItem: (k, v) => {
      if (!streamingActive) window.localStorage.setItem(k, v);
    },
    removeItem: (k) => window.localStorage.removeItem(k),
  };
});

type ExploreState = {
  chats: Chat[];
  activeId: string | null;
  sending: boolean;

  newChat: () => void;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  sendMessage: (text: string) => Promise<void>;
  /** Aborta a geração em andamento, preservando o parcial já recebido. */
  stopGeneration: () => void;
};

export const useExploreStore = create<ExploreState>()(
  persist(
    (set, get) => ({
      chats: [],
      activeId: null,
      sending: false,

      newChat: () => set({ activeId: null }),

      selectChat: (id) => set({ activeId: id }),

      deleteChat: (id) => {
        // Se o chat apagado é o que está gerando, aborta — senão o stream
        // continuaria escrevendo num chat inexistente e travaria `sending`.
        if (id === streamingChatId) abortRef?.abort();
        set((state) => {
          const chats = state.chats.filter((c) => c.id !== id);
          const activeId = state.activeId === id ? null : state.activeId;
          return { chats, activeId };
        });
      },

      stopGeneration: () => abortRef?.abort(),

      sendMessage: async (text) => {
        const trimmed = text.trim();
        if (!trimmed || get().sending) return;

        const now = new Date().toISOString();
        const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed, createdAt: now };
        const assistantId = uid();
        const pendingMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: '',
          pending: true,
          streaming: true,
          stage: 'queued',
          createdAt: now,
        };

        let chatId = get().activeId;
        set((state) => {
          if (chatId) {
            return {
              sending: true,
              chats: state.chats.map((c) =>
                c.id === chatId
                  ? { ...c, messages: [...c.messages, userMsg, pendingMsg], updatedAt: now }
                  : c,
              ),
            };
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

        streamingChatId = chatId;
        streamingActive = true;

        // Patch imutável da bolha do assistente. NÃO bumpa updatedAt (senão o
        // RecentsRail re-renderiza a cada flush) — o updatedAt é bumpado só no fim.
        const patch = (fn: (m: ChatMessage) => ChatMessage) =>
          set((state) => ({
            chats: state.chats.map((c) =>
              c.id === chatId
                ? { ...c, messages: c.messages.map((m) => (m.id === assistantId ? fn(m) : m)) }
                : c,
            ),
          }));

        const flush = () => {
          if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
          }
          if (!tokenBuffer) return;
          const chunk = tokenBuffer;
          tokenBuffer = '';
          patch((m) => ({ ...m, content: m.content + chunk }));
        };
        const scheduleFlush = () => {
          if (flushTimer) return;
          flushTimer = setTimeout(() => {
            flushTimer = null;
            flush();
          }, FLUSH_MS);
        };

        abortRef = new AbortController();
        let errored = false;
        try {
          for await (const ev of askExploreStream(trimmed, abortRef.signal)) {
            switch (ev.type) {
              case 'status':
                patch((m) => ({ ...m, stage: ev.stage }));
                break;
              case 'sources':
                patch((m) => ({ ...m, sources: toSources(ev.sources) }));
                break;
              case 'token':
                tokenBuffer += ev.text;
                scheduleFlush();
                break;
              case 'error':
                flush();
                errored = true;
                patch((m) => ({ ...m, content: m.content || STUCK_ANSWER }));
                break;
              case 'done':
                break;
            }
          }
          flush();
        } catch {
          flush();
          // Abort (botão Parar) preserva o parcial; erro real vira mensagem fixa.
          if (!abortRef?.signal.aborted && !errored) {
            patch((m) => ({ ...m, content: m.content || STUCK_ANSWER }));
          }
        } finally {
          flush();
          const aborted = abortRef?.signal.aborted ?? false;
          abortRef = null;
          streamingChatId = null;
          streamingActive = false; // reabre a persistência: a próxima gravação vale

          // Finaliza a bolha e bumpa updatedAt UMA vez. Se abortou antes de
          // qualquer conteúdo, remove a bolha vazia (senão fica só o avatar).
          set((state) => ({
            sending: false,
            chats: state.chats.map((c) => {
              if (c.id !== chatId) return c;
              const messages = c.messages
                .map((m) =>
                  m.id === assistantId
                    ? { ...m, pending: false, streaming: false, stage: undefined }
                    : m,
                )
                .filter(
                  (m) => !(aborted && m.id === assistantId && !m.content && !m.sources?.length),
                );
              return { ...c, updatedAt: new Date().toISOString(), messages };
            }),
          }));
        }
      },
    }),
    {
      name: 'mlp-explore',
      storage: guardedStorage,
      partialize: (state) => ({
        chats: withoutPendingMessages(state.chats),
        activeId: state.activeId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.chats = repairPendingMessages(state.chats);
      },
    },
  ),
);
