import { describe, expect, it } from 'vitest';
import { type Chat, repairPendingMessages, withoutPendingMessages } from './explore-store';

function chatWith(messages: Chat['messages']): Chat {
  return { id: 'c1', title: 't', messages, createdAt: 'now', updatedAt: 'now' };
}

describe('explore-store persistence helpers', () => {
  it('withoutPendingMessages drops in-flight assistant bubbles before persisting', () => {
    const chats = [
      chatWith([
        { id: 'u', role: 'user', content: 'oi', createdAt: 'now' },
        { id: 'a', role: 'assistant', content: '', pending: true, createdAt: 'now' },
      ]),
    ];
    const persisted = withoutPendingMessages(chats);
    expect(persisted[0].messages.map((m) => m.id)).toEqual(['u']);
  });

  it('repairPendingMessages turns a stuck pending bubble into a cleared error', () => {
    const chats = [
      chatWith([{ id: 'a', role: 'assistant', content: '', pending: true, createdAt: 'now' }]),
    ];
    const repaired = repairPendingMessages(chats);
    expect(repaired[0].messages[0].pending).toBe(false);
    expect(repaired[0].messages[0].content).not.toBe('');
  });

  it('repairPendingMessages leaves settled messages untouched', () => {
    const chats = [
      chatWith([{ id: 'a', role: 'assistant', content: 'resposta', createdAt: 'now' }]),
    ];
    expect(repairPendingMessages(chats)[0].messages[0].content).toBe('resposta');
  });
});
