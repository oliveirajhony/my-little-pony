import { DomainError } from './errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 120;
const MAX_MESSAGE = 4000;

export type ContactMessageProps = {
  id: string;
  documentId: string;
  ownerId: string;
  fromName: string;
  fromEmail: string;
  message: string;
  createdAt: Date;
  readAt: Date | null;
};

/**
 * Mensagem de contato deixada por um leitor num documento publicado. Pertence ao
 * autor do documento (ownerId); guarda os próprios limites (nome, e-mail, tamanho).
 */
export class ContactMessage {
  private constructor(private props: ContactMessageProps) {}

  static fromProps(props: ContactMessageProps): ContactMessage {
    return new ContactMessage(props);
  }

  static create(input: {
    id: string;
    documentId: string;
    ownerId: string;
    fromName: string;
    fromEmail: string;
    message: string;
    now: Date;
  }): ContactMessage {
    const fromName = input.fromName.trim();
    if (fromName.length === 0 || fromName.length > MAX_NAME) {
      throw new DomainError('invalid-contact');
    }
    const fromEmail = input.fromEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(fromEmail)) throw new DomainError('invalid-email');
    const message = input.message.trim();
    if (message.length === 0 || message.length > MAX_MESSAGE) {
      throw new DomainError('invalid-contact');
    }
    return new ContactMessage({
      id: input.id,
      documentId: input.documentId,
      ownerId: input.ownerId,
      fromName,
      fromEmail,
      message,
      createdAt: input.now,
      readAt: null,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get documentId(): string {
    return this.props.documentId;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get fromName(): string {
    return this.props.fromName;
  }
  get fromEmail(): string {
    return this.props.fromEmail;
  }
  get message(): string {
    return this.props.message;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get readAt(): Date | null {
    return this.props.readAt;
  }

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }

  markRead(now: Date): void {
    this.props.readAt ??= now;
  }

  toProps(): ContactMessageProps {
    return { ...this.props };
  }
}
