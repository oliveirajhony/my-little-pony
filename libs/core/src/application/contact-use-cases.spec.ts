import type { ContactMessage } from '../domain/contact-message.js';
import { Document } from '../domain/document.js';
import { DEFAULT_PAGE_CONFIG } from '../domain/page-config.js';
import {
  ListContactMessages,
  MarkContactMessageRead,
  SubmitContactMessage,
} from './contact-use-cases.js';
import type {
  Clock,
  ContactMessagePage,
  ContactMessageRepository,
  DocumentRepository,
  IdGenerator,
} from './ports.js';

const clock: Clock = { now: () => new Date('2026-07-05T00:00:00.000Z') };
let seq = 0;
const ids: IdGenerator = { next: () => `m${++seq}` };

class FakeDocs implements Pick<DocumentRepository, 'findPublishedBySlug'> {
  byKey = new Map<string, Document>();
  publish(ownerId: string, slug: string, id: string) {
    const doc = Document.fromProps({
      id,
      ownerId,
      title: 'Doc',
      slug,
      status: 'published',
      content: '',
      excerpt: '',
      categories: [],
      indexStatus: 'none',
      version: 1,
      pageConfig: DEFAULT_PAGE_CONFIG,
      publishedAt: clock.now(),
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    this.byKey.set(`${ownerId}:${slug}`, doc);
  }
  async findPublishedBySlug(ownerId: string, slug: string) {
    return this.byKey.get(`${ownerId}:${slug}`) ?? null;
  }
}

class FakeMessages implements ContactMessageRepository {
  items: ContactMessage[] = [];
  async save(message: ContactMessage) {
    const i = this.items.findIndex((m) => m.id === message.id);
    if (i >= 0) this.items[i] = message;
    else this.items.push(message);
  }
  async findById(id: string) {
    return this.items.find((m) => m.id === id) ?? null;
  }
  async listByOwner(query: {
    ownerId: string;
    page: number;
    limit: number;
  }): Promise<ContactMessagePage> {
    const owned = this.items.filter((m) => m.isOwnedBy(query.ownerId));
    return { items: owned, total: owned.length };
  }
  async countUnread(ownerId: string) {
    return this.items.filter((m) => m.isOwnedBy(ownerId) && m.readAt === null).length;
  }
}

function submitDeps() {
  const docs = new FakeDocs();
  const messages = new FakeMessages();
  docs.publish('u1', 'guia', 'doc1');
  const submit = new SubmitContactMessage(
    docs as unknown as DocumentRepository,
    messages,
    ids,
    clock,
  );
  return { docs, messages, submit };
}

describe('contact use cases', () => {
  it('records a message on a published document', async () => {
    const { messages, submit } = submitDeps();
    await submit.execute({
      ownerId: 'u1',
      slug: 'guia',
      fromName: 'Ana',
      fromEmail: 'ANA@Exemplo.com',
      message: 'Ótimo texto!',
    });
    expect(messages.items).toHaveLength(1);
    expect(messages.items[0].documentId).toBe('doc1');
    expect(messages.items[0].fromEmail).toBe('ana@exemplo.com');
    expect(messages.items[0].readAt).toBeNull();
  });

  it('rejects a message for a slug that is not published', async () => {
    const { submit } = submitDeps();
    await expect(
      submit.execute({
        ownerId: 'u1',
        slug: 'inexistente',
        fromName: 'Ana',
        fromEmail: 'ana@exemplo.com',
        message: 'oi',
      }),
    ).rejects.toThrow(/document-not-found/);
  });

  it('rejects an empty message', async () => {
    const { submit } = submitDeps();
    await expect(
      submit.execute({
        ownerId: 'u1',
        slug: 'guia',
        fromName: 'Ana',
        fromEmail: 'ana@exemplo.com',
        message: '   ',
      }),
    ).rejects.toThrow(/invalid-contact/);
  });

  it('lists the owner messages with total and unread count', async () => {
    const { messages, submit } = submitDeps();
    await submit.execute({
      ownerId: 'u1',
      slug: 'guia',
      fromName: 'Ana',
      fromEmail: 'ana@exemplo.com',
      message: 'primeira',
    });
    const result = await new ListContactMessages(messages).execute({
      ownerId: 'u1',
      page: 1,
      limit: 20,
    });
    expect(result.total).toBe(1);
    expect(result.unread).toBe(1);
  });

  it('marks a message as read (only for its owner)', async () => {
    const { messages, submit } = submitDeps();
    await submit.execute({
      ownerId: 'u1',
      slug: 'guia',
      fromName: 'Ana',
      fromEmail: 'ana@exemplo.com',
      message: 'ler depois',
    });
    const id = messages.items[0].id;
    await expect(
      new MarkContactMessageRead(messages, clock).execute({ id, ownerId: 'intruso' }),
    ).rejects.toThrow(/document-not-found/);
    await new MarkContactMessageRead(messages, clock).execute({ id, ownerId: 'u1' });
    expect(await messages.countUnread('u1')).toBe(0);
  });
});
