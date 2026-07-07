import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExploreStreamEvent } from './explore-api';

// Mock do cliente de streaming: cada teste injeta seu próprio gerador em `h.impl`.
const h = vi.hoisted(() => ({
  impl: null as null | ((q: string, signal?: AbortSignal) => AsyncIterable<ExploreStreamEvent>),
}));
vi.mock('./explore-api', () => ({
  askExploreStream: (q: string, signal?: AbortSignal) => h.impl?.(q, signal),
}));

import { useExploreStore } from './explore-store';

const source = {
  documentId: 'd1',
  score: 1,
  snippet: 'trecho',
  kind: 'native' as const,
  title: 'Doc',
  slug: 'doc',
};

function assistantOf() {
  const chat = useExploreStore.getState().chats[0];
  return chat.messages.find((m) => m.role === 'assistant');
}

beforeEach(() => {
  useExploreStore.setState({ chats: [], activeId: null, sending: false });
});

describe('explore-store streaming', () => {
  it('renders sources then accumulates tokens and finalizes the bubble', async () => {
    const events: ExploreStreamEvent[] = [
      { type: 'status', stage: 'retrieving' },
      { type: 'sources', grounded: true, sources: [source] },
      { type: 'token', text: 'oi' },
      { type: 'token', text: ' mundo' },
      { type: 'done', grounded: true },
    ];
    h.impl = async function* () {
      for (const e of events) yield e;
    };

    await useExploreStore.getState().sendMessage('café');

    const a = assistantOf();
    expect(a?.content).toBe('oi mundo');
    expect(a?.pending).toBeFalsy();
    expect(a?.streaming).toBeFalsy();
    expect(a?.sources?.[0]).toMatchObject({ title: 'Doc', snippet: 'trecho' });
    expect(useExploreStore.getState().sending).toBe(false);
  });

  it('stopGeneration aborts mid-stream and keeps the partial answer', async () => {
    h.impl = async function* (_q, signal) {
      yield { type: 'token', text: 'parcial' };
      // trava até o abort (simula o LLM gerando enquanto o usuário clica Parar).
      await new Promise<void>((resolve) => signal?.addEventListener('abort', () => resolve()));
    };

    const pending = useExploreStore.getState().sendMessage('x');
    await new Promise((r) => setTimeout(r, 10)); // deixa começar e bufferizar
    useExploreStore.getState().stopGeneration();
    await pending;

    const a = assistantOf();
    expect(a?.content).toBe('parcial'); // parcial preservado
    expect(a?.streaming).toBeFalsy();
    expect(useExploreStore.getState().sending).toBe(false);
  });

  it('shows a fixed error message when the stream errors', async () => {
    h.impl = async function* () {
      yield { type: 'error', message: 'detalhe interno' };
    };

    await useExploreStore.getState().sendMessage('x');

    const a = assistantOf();
    expect(a?.content).toContain('Não consegui responder');
    expect(a?.content).not.toContain('interno');
    expect(a?.streaming).toBeFalsy();
  });
});
