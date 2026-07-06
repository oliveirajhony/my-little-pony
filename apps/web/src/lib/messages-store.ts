'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { type ContactMessage, listMessages, markMessageRead } from './messages-api';

type MessagesState = {
  items: ContactMessage[];
  unread: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

export const useMessagesStore = create<MessagesState>((set, get) => ({
  items: [],
  unread: 0,
  status: 'idle',

  load: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      const result = await listMessages();
      set({ items: result.items, unread: result.unread, status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },

  refresh: async () => {
    try {
      const result = await listMessages();
      set({ items: result.items, unread: result.unread, status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },

  markRead: async (id) => {
    await markMessageRead(id);
    set((state) => {
      const items = state.items.map((m) =>
        m.id === id && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
      );
      return { items, unread: items.filter((m) => !m.readAt).length };
    });
  },
}));

/** Assina o inbox e dispara a carga inicial no mount. */
export function useMessages() {
  const items = useMessagesStore((s) => s.items);
  const unread = useMessagesStore((s) => s.unread);
  const status = useMessagesStore((s) => s.status);

  useEffect(() => {
    void useMessagesStore.getState().load();
  }, []);

  return { items, unread, hydrated: status === 'ready' || status === 'error' };
}
