'use client';

import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fullDate, relativeDate } from '../../lib/format-date';
import { useMessages, useMessagesStore } from '../../lib/messages-store';

export function MessagesView() {
  const { items, unread, hydrated } = useMessages();
  const markRead = useMessagesStore((s) => s.markRead);

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Mensagens</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recebidas pelo "Fale com a gente" dos seus documentos publicados.
          </p>
        </div>
        {unread > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {unread} não {unread === 1 ? 'lida' : 'lidas'}
          </span>
        )}
      </header>

      {hydrated && items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="size-5" />
          </span>
          <div>
            <p className="font-display font-medium">Nenhuma mensagem ainda</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Quando alguém escrever pela página pública de um documento, aparece aqui.
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((m) => {
            const isUnread = !m.readAt;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => isUnread && markRead(m.id)}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-colors',
                    isUnread ? 'border-primary/40 bg-primary/[0.03]' : 'hover:bg-accent/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        {isUnread && (
                          <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                        )}
                        <span className="truncate">{m.fromName}</span>
                      </p>
                      <a
                        href={`mailto:${m.fromEmail}`}
                        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {m.fromEmail}
                      </a>
                    </div>
                    <time
                      dateTime={m.createdAt}
                      title={fullDate(m.createdAt)}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {relativeDate(m.createdAt)}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{m.message}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
