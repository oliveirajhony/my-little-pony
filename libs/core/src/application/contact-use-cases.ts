import { ContactMessage } from '../domain/contact-message.js';
import { DomainError } from '../domain/errors.js';
import type { Clock, ContactMessageRepository, DocumentRepository, IdGenerator } from './ports.js';

/** Registra uma mensagem de contato deixada num documento publicado. */
export class SubmitContactMessage {
  constructor(
    private readonly docs: DocumentRepository,
    private readonly messages: ContactMessageRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    ownerId: string;
    slug: string;
    fromName: string;
    fromEmail: string;
    message: string;
  }): Promise<void> {
    // A mensagem é sobre um documento publicado; 404 se não existir/estiver publicado.
    const doc = await this.docs.findPublishedBySlug(input.ownerId, input.slug);
    if (!doc) throw new DomainError('document-not-found');
    const message = ContactMessage.create({
      id: this.ids.next(),
      documentId: doc.id,
      ownerId: input.ownerId,
      fromName: input.fromName,
      fromEmail: input.fromEmail,
      message: input.message,
      now: this.clock.now(),
    });
    await this.messages.save(message);
  }
}

/** Inbox do autor: lista as mensagens recebidas + total e não-lidas. */
export class ListContactMessages {
  constructor(private readonly messages: ContactMessageRepository) {}

  async execute(input: {
    ownerId: string;
    page: number;
    limit: number;
  }): Promise<{ items: ContactMessage[]; total: number; unread: number }> {
    const [page, unread] = await Promise.all([
      this.messages.listByOwner(input),
      this.messages.countUnread(input.ownerId),
    ]);
    return { items: page.items, total: page.total, unread };
  }
}

/** Marca uma mensagem do autor como lida. */
export class MarkContactMessageRead {
  constructor(
    private readonly messages: ContactMessageRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: { id: string; ownerId: string }): Promise<void> {
    const message = await this.messages.findById(input.id);
    if (!message?.isOwnedBy(input.ownerId)) {
      throw new DomainError('document-not-found');
    }
    message.markRead(this.clock.now());
    await this.messages.save(message);
  }
}
