import type { ContactMessage } from '@my-little-pony/core';

export type ContactMessageView = {
  id: string;
  documentId: string;
  fromName: string;
  fromEmail: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export function toContactMessageView(message: ContactMessage): ContactMessageView {
  return {
    id: message.id,
    documentId: message.documentId,
    fromName: message.fromName,
    fromEmail: message.fromEmail,
    message: message.message,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt ? message.readAt.toISOString() : null,
  };
}
