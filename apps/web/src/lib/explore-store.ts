'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store da tela "Explorar" — busca híbrida + RAG sobre os documentos do usuário.
 *
 * MOCK: as respostas são geradas localmente (`mockAnswer`) para prototipar a
 * experiência de chat. Quando o backend existir, `sendMessage` passa a chamar
 * o endpoint de RAG e preencher `content`/`sources` com o retorno real.
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

/** Fontes de exemplo — no backend virão dos documentos realmente recuperados. */
const MOCK_SOURCES: ChatSource[] = [
  {
    id: 'src-1',
    title: 'Guia de onboarding',
    snippet: 'O acesso ao ambiente é liberado pelo time de plataforma em até 24h após o aceite.',
  },
  {
    id: 'src-2',
    title: 'Política de férias 2026',
    snippet: 'As solicitações devem ser registradas com no mínimo 30 dias de antecedência.',
  },
  {
    id: 'src-3',
    title: 'Arquitetura do produto',
    snippet: 'A camada de indexação usa embeddings bge-m3 e reranking antes da geração.',
  },
];

/** Resposta mockada — sempre "ancorada" nos documentos. */
function mockAnswer(question: string): { content: string; sources: ChatSource[] } {
  const q = question.trim();
  const sources = MOCK_SOURCES.slice(0, 2);
  const content = [
    `Com base nos seus documentos, aqui está o que encontrei sobre "${titleFrom(q)}":`,
    '',
    `Os pontos relevantes aparecem em **${sources[0].title}** e **${sources[1].title}**. ` +
      'A resposta consolida esses trechos sem inventar informação fora do que está indexado — ' +
      'quando não houver base documental suficiente, eu aviso em vez de completar por conta própria.',
    '',
    'Confira as fontes abaixo para o contexto completo.',
  ].join('\n');
  return { content, sources };
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

        // MOCK: simula a latência de recuperação + geração.
        await new Promise((r) => setTimeout(r, 850));

        const { content, sources } = mockAnswer(trimmed);
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
