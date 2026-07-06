import { apiFetch } from './api-client';

export type ContactMessage = {
  id: string;
  documentId: string;
  fromName: string;
  fromEmail: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export type MessageList = {
  items: ContactMessage[];
  total: number;
  unread: number;
  page: number;
  limit: number;
};

const MAX_LIST = 100;

/** Inbox do autor: mensagens de "Fale com a gente" recebidas nos seus documentos. */
export function listMessages(): Promise<MessageList> {
  return apiFetch<MessageList>(`/me/messages?limit=${MAX_LIST}`);
}

export function markMessageRead(id: string): Promise<void> {
  return apiFetch<void>(`/me/messages/${id}/read`, { method: 'PATCH' });
}
