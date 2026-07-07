'use client';

import {
  ArrowUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useArquivosStore } from '../../lib/arquivos-store';
import { useDocuments } from '../../lib/documents-store';
import {
  type Chat,
  type ChatMessage,
  type ChatSource,
  type StreamStage,
  useExploreStore,
} from '../../lib/explore-store';
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

  // Sair da tela (navegação/unmount) aborta uma geração em andamento — senão o
  // fetch/stream seguiria vivo escrevendo num componente desmontado.
  useEffect(() => () => useExploreStore.getState().stopGeneration(), []);

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
  const stopGeneration = useExploreStore((s) => s.stopGeneration);
  // Pin-to-bottom intencional: só rola sozinho se o usuário JÁ está no fim. Se ele
  // rolou pra cima pra reler, os tokens não o arrastam de volta.
  const pinnedRef = useRef(true);

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, []);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      pinnedRef.current = entry.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola ao chegar conteúdo novo, se pinado
  useEffect(() => {
    if (pinnedRef.current) bottomRef.current?.scrollIntoView({ block: 'end' });
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
          {sending && (
            <div className="mb-2 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={stopGeneration}
              >
                <Square className="size-3.5" />
                Parar
              </Button>
            </div>
          )}
          <Composer onSend={onSend} sending={sending} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            As respostas se baseiam nos seus documentos publicados e arquivos importados.
          </p>
        </div>
      </div>
    </>
  );
}

const STAGE_LABEL: Record<StreamStage, string> = {
  queued: 'Na fila…',
  retrieving: 'Consultando seus documentos e arquivos…',
  generating: 'Gerando resposta…',
};

// memo: durante o streaming a lista de mensagens muda a cada flush (~60ms); sem
// memo, TODAS as bolhas re-renderizariam. Só a que muda de fato re-renderiza.
export const MessageBubble = memo(function MessageBubble({ message }: { message: ChatMessage }) {
  const sources = message.sources ?? [];

  // Mapeia `[n]` (transformado em <cite> pelo rehypeCitations) para a fonte
  // sources[n-1]. Memo por `sources`: o conteúdo muda a cada flush, mas as
  // fontes não — evita recriar os renderers durante o streaming.
  const citationComponents = useMemo<Components>(
    () => ({
      cite: ({ node }) => {
        const index = Number(node?.properties?.dataCitation);
        return <CitationChip index={index} source={sources[index - 1]} />;
      },
      // Caret de streaming: o rehypeStreamingCaret injeta um <data> no fim do
      // texto para o caret ficar inline (colado ao último caractere).
      data: () => <StreamCaret />,
    }),
    [sources],
  );

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  // Etapa antes de qualquer texto/fonte (fila → recuperando → gerando).
  const showStage = message.streaming && !message.content && sources.length === 0;

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        {showStage ? (
          <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {STAGE_LABEL[message.stage ?? 'retrieving']}
          </div>
        ) : (
          <>
            <div
              // Anuncia a resposta UMA vez, ao concluir. Durante o streaming fica
              // 'off' — senão o leitor de tela relê o texto inteiro a cada flush.
              aria-live={message.streaming ? 'off' : 'polite'}
              aria-busy={message.streaming}
              className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
            >
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={
                  message.streaming ? [rehypeCitations, rehypeStreamingCaret] : [rehypeCitations]
                }
                components={citationComponents}
              >
                {message.content}
              </Markdown>
            </div>

            {/* Linha de fontes compacta abaixo da resposta (estilo Perplexity). */}
            {sources.length > 0 && <CompactSources sources={sources} />}

            {/* Barra de ações — só na resposta concluída (não durante o stream). */}
            {!message.streaming && message.content && <MessageActions content={message.content} />}
          </>
        )}
      </div>
    </div>
  );
});

/* ------------------------------- Citações -------------------------------- */

/** Rota que abre a fonte: doc nativo → editor; arquivo importado → Arquivos. */
function sourceHref(source: ChatSource): string | null {
  if (!source.documentId) return null;
  return source.kind === 'file'
    ? `/app/arquivos?file=${source.documentId}`
    : `/app/editor?id=${source.documentId}`;
}

/** Marcador `[n]` inline: chip hoverável que abre a fonte citada. */
function CitationChip({ index, source }: { index: number; source?: ChatSource }) {
  // `[n]` sem fonte correspondente (LLM citou fora do intervalo): mantém o texto cru.
  if (!source) {
    return <span className="text-muted-foreground">[{index}]</span>;
  }

  const href = sourceHref(source);
  const label = `Citação ${index}: ${source.title}`;
  const chipClass =
    'ml-0.5 inline-flex h-[1.15em] min-w-[1.15em] items-center justify-center rounded-[0.3rem] bg-muted px-1 align-super text-[0.7em] font-medium leading-none text-muted-foreground no-underline transition-colors hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {href ? (
          <Link href={href} aria-label={label} className={chipClass}>
            {index}
          </Link>
        ) : (
          <button type="button" aria-label={label} className={chipClass}>
            {index}
          </button>
        )}
      </HoverCardTrigger>
      <HoverCardContent>
        <SourceCardBody source={source} />
      </HoverCardContent>
    </HoverCard>
  );
}

/** Linha compacta de pílulas + contador "N fontes" abaixo da resposta. */
function CompactSources({ sources }: { sources: ChatSource[] }) {
  // Dedup por documento: o RAG traz vários trechos (chunks) do mesmo doc; a linha
  // mostra 1 pílula por documento (o 1º trecho, de maior score). As citações
  // inline [n] seguem mapeando o trecho exato — só esta linha é enxugada.
  const docs = useMemo(() => {
    const seen = new Set<string>();
    return sources.filter((s) => {
      const key = s.documentId || s.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [sources]);

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">
        {docs.length} {docs.length === 1 ? 'fonte' : 'fontes'}
      </span>
      {docs.map((source) => (
        <SourcePill key={source.documentId || source.id} source={source} />
      ))}
    </div>
  );
}

/** Pílula da linha de fontes: ícone + título, com o mesmo hover card. */
function SourcePill({ source }: { source: ChatSource }) {
  const href = sourceHref(source);
  const Icon = source.kind === 'file' ? Paperclip : FileText;
  const pillClass =
    'inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] text-foreground no-underline transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const inner = (
    <>
      <Icon className="size-3 shrink-0 text-muted-foreground" />
      <span className="max-w-[10rem] truncate">{source.title}</span>
    </>
  );

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {href ? (
          <Link href={href} className={pillClass}>
            {inner}
          </Link>
        ) : (
          <button type="button" className={pillClass}>
            {inner}
          </button>
        )}
      </HoverCardTrigger>
      <HoverCardContent>
        <SourceCardBody source={source} />
      </HoverCardContent>
    </HoverCard>
  );
}

/** Conteúdo do hover card: título, trecho no contexto e ação de abrir. */
function SourceCardBody({ source }: { source: ChatSource }) {
  const href = sourceHref(source);
  const isFile = source.kind === 'file';
  const Icon = isFile ? Paperclip : FileText;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 text-sm font-medium leading-snug">{source.title}</p>
      </div>
      {source.snippet && (
        <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">
          {source.snippet}
        </p>
      )}
      {href && (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-0.5 h-8 w-full justify-center gap-1.5"
        >
          <Link href={href}>
            <ExternalLink className="size-3.5" />
            {isFile ? 'Abrir arquivo' : 'Abrir documento'}
          </Link>
        </Button>
      )}
    </div>
  );
}

/* --------------------- Caret de streaming + ações (#47/#48) --------------- */

/** Caret piscante colado ao último caractere gerado (inline, sem reflow). */
function StreamCaret() {
  return (
    <span
      data-caret
      aria-hidden
      className="ml-px inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse rounded-full bg-foreground/70 align-baseline"
    />
  );
}

/** Barra de ações da resposta concluída: copiar (Baixar reservado p/ Fatia 2). */
function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponível (permissão / contexto inseguro) — falha silenciosa.
    }
  }

  return (
    <div className="mt-2 flex items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={copy}
        aria-label="Copiar resposta"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
      {/* Slot do Baixar (Fatia 2 / #49) — reservado, desabilitado por ora. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
        aria-label="Baixar resposta (em breve)"
        title="Em breve"
      >
        <Download className="size-3.5" />
        Baixar
      </Button>
    </div>
  );
}

/** Nó mínimo do hast que o rehypeCitations toca (evita depender de @types/hast). */
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

/**
 * Plugin rehype (só no streaming): anexa um `<data data-caret>` ao fim do último
 * bloco, para o caret ficar no mesmo fluxo do texto — colado ao último caractere,
 * inline, sem "pulo" a cada flush. Some no `done` (o plugin não roda mais).
 */
function rehypeStreamingCaret() {
  return (tree: HastNode) => {
    const caret: HastNode = {
      type: 'element',
      tagName: 'data',
      properties: { dataCaret: '1' },
      children: [],
    };
    const children = tree.children;
    if (!children || children.length === 0) {
      tree.children = [caret];
      return;
    }
    const last = children[children.length - 1];
    if (last.type === 'element' && last.children) {
      last.children.push(caret);
    } else {
      children.push(caret);
    }
  };
}

const CITATION_RE = /\[(\d+)\]/g;

/**
 * Plugin rehype: transforma marcadores `[n]` em texto num elemento `<cite>` com
 * `data-citation="n"`, para a UI trocá-lo por um chip de citação. Pula conteúdo
 * de código (`code`/`pre`) — `[0]` num snippet não é citação.
 */
function rehypeCitations() {
  return (tree: HastNode) => visitCitations(tree, false);
}

function visitCitations(node: HastNode, inCode: boolean) {
  if (!node.children) return;
  const next: HastNode[] = [];
  for (const child of node.children) {
    if (child.type === 'element') {
      const code = inCode || child.tagName === 'code' || child.tagName === 'pre';
      visitCitations(child, code);
      next.push(child);
    } else if (child.type === 'text' && !inCode && child.value) {
      next.push(...splitCitations(child.value));
    } else {
      next.push(child);
    }
  }
  node.children = next;
}

function splitCitations(value: string): HastNode[] {
  const out: HastNode[] = [];
  let last = 0;
  CITATION_RE.lastIndex = 0;
  let match = CITATION_RE.exec(value);
  while (match) {
    if (match.index > last) out.push({ type: 'text', value: value.slice(last, match.index) });
    out.push({
      type: 'element',
      tagName: 'cite',
      properties: { dataCitation: match[1] },
      children: [{ type: 'text', value: match[0] }],
    });
    last = match.index + match[0].length;
    match = CITATION_RE.exec(value);
  }
  if (out.length === 0) return [{ type: 'text', value }];
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
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
