'use client';

import { ArrowUp, FileText, Loader2, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useArquivosStore } from '../../lib/arquivos-store';
import { useDocuments } from '../../lib/documents-store';
import { type Chat, type ChatMessage, useExploreStore } from '../../lib/explore-store';
import { relativeDate } from '../../lib/format-date';

export function ExploreView() {
  const chats = useExploreStore((s) => s.chats);
  const activeId = useExploreStore((s) => s.activeId);
  const sending = useExploreStore((s) => s.sending);
  const newChat = useExploreStore((s) => s.newChat);
  const selectChat = useExploreStore((s) => s.selectChat);
  const deleteChat = useExploreStore((s) => s.deleteChat);
  const sendMessage = useExploreStore((s) => s.sendMessage);

  // Corpus que fundamenta as respostas: documentos publicados + arquivos importados.
  const { documents } = useDocuments();
  const filesCount = useArquivosStore((s) => s.files.length);

  // Evita mismatch de hidratação: o estado persistido só aparece após o mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = mounted ? (chats.find((c) => c.id === activeId) ?? null) : null;
  const messages = active?.messages ?? [];
  const docCount = documents.filter((d) => d.status === 'published').length;

  return (
    <div className="flex h-[calc(100svh-3.5rem)]">
      <RecentsRail
        chats={mounted ? chats : []}
        activeId={activeId}
        onNew={newChat}
        onSelect={selectChat}
        onDelete={deleteChat}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {messages.length === 0 ? (
          <HeroState
            onSend={sendMessage}
            sending={sending}
            docCount={docCount}
            fileCount={mounted ? filesCount : 0}
          />
        ) : (
          <Conversation messages={messages} onSend={sendMessage} sending={sending} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Recentes rail ----------------------------- */

function RecentsRail({
  chats,
  activeId,
  onNew,
  onSelect,
  onDelete,
}: {
  chats: Chat[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const showSearch = chats.length > 8;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats;
  }, [chats, query]);

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r md:flex">
      <div className="p-3">
        <Button variant="outline" className="w-full justify-start" onClick={onNew}>
          <Plus />
          Novo chat
        </Button>
      </div>

      <div className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Recentes
      </div>

      {showSearch && (
        <div className="relative px-3 pb-1">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversas…"
            aria-label="Buscar conversas"
            className="h-8 pl-8 text-sm"
          />
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 p-2 pt-1">
          {chats.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Suas conversas aparecem aqui.
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Nenhuma conversa encontrada.
            </p>
          ) : (
            filtered.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  'group relative flex items-center rounded-md text-sm',
                  chat.id === activeId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(chat.id)}
                  className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-2.5 py-2 text-left"
                >
                  <span className="w-full truncate">{chat.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {relativeDate(chat.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(chat.id)}
                  aria-label={`Apagar conversa ${chat.title}`}
                  className="mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

/* -------------------------------- Hero state ------------------------------ */

function HeroState({
  onSend,
  sending,
  docCount,
  fileCount,
}: {
  onSend: (text: string) => void;
  sending: boolean;
  docCount: number;
  fileCount: number;
}) {
  const empty = docCount + fileCount === 0;
  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4">
      <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="size-5" />
      </span>
      <h1 className="text-center font-display text-2xl font-semibold tracking-tight">
        Por onde começamos?
      </h1>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Pergunte qualquer coisa — as respostas se baseiam nos seus documentos publicados e arquivos
        importados.
      </p>

      <div className="mt-6 w-full">
        <Composer onSend={onSend} sending={sending} autoFocus />
      </div>

      <div className="mt-3 text-center text-xs text-muted-foreground">
        {empty ? (
          <span>
            <Link href="/app/arquivos" className="text-primary hover:underline">
              Importe arquivos
            </Link>{' '}
            ou publique documentos para começar a consultar.
          </span>
        ) : (
          <span>
            Consultando {plural(docCount, 'documento', 'documentos')} e{' '}
            {plural(fileCount, 'arquivo', 'arquivos')}.
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Conversation ----------------------------- */

function Conversation({
  messages,
  onSend,
  sending,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  sending: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola ao chegar mensagem nova
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  return (
    <>
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t bg-background">
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          <Composer onSend={onSend} sending={sending} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            As respostas se baseiam nos seus documentos publicados e arquivos importados.
          </p>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        {message.pending ? (
          <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Consultando seus documentos e arquivos…
          </div>
        ) : (
          <>
            <div className="text-sm leading-relaxed">
              <RichText text={message.content} />
            </div>
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Fontes</p>
                <div className="flex flex-col gap-1.5">
                  {message.sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2"
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{source.title}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {source.snippet}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Renderiza texto simples com **negrito** e quebras de linha. */
function RichText({ text }: { text: string }): ReactNode {
  return text.split('\n').map((line, lineIndex) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: linhas de texto estático
    <span key={lineIndex} className="block min-h-[0.5em]">
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
        part.startsWith('**') && part.endsWith('**') ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: trechos de texto estático
          <strong key={partIndex} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
    </span>
  ));
}

/* -------------------------------- Composer -------------------------------- */

function Composer({
  onSend,
  sending,
  autoFocus,
}: {
  onSend: (text: string) => void;
  sending: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: reajusta a altura ao digitar
  useLayoutEffect(autoGrow, [value]);

  function submit() {
    const text = value.trim();
    if (!text || sending) return;
    onSend(text);
    setValue('');
  }

  return (
    <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <textarea
        ref={textareaRef}
        // biome-ignore lint/a11y/noAutofocus: foco esperado no campo de chat
        autoFocus={autoFocus}
        rows={1}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Pergunte alguma coisa…"
        aria-label="Mensagem"
        className="max-h-[200px] min-h-[24px] flex-1 resize-none self-center bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      <Button
        type="button"
        size="icon"
        className="size-8 shrink-0 rounded-full"
        disabled={!value.trim() || sending}
        onClick={submit}
        aria-label="Enviar"
      >
        {sending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
      </Button>
    </div>
  );
}
