'use client';

import {
  ArrowUpDown,
  Eye,
  FileCode,
  FileText,
  FolderOpen,
  Maximize2,
  Minimize2,
  Search,
  Trash2,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  ACCEPT_ATTR,
  type FileKind,
  formatBytes,
  type ImportedFile,
  KIND_LABEL,
  kindFromName,
} from '../../lib/arquivos-api';
import { useArquivos, useArquivosStore } from '../../lib/arquivos-store';
import { fullDate, relativeDate } from '../../lib/format-date';
import { DocumentViewer } from './document-viewer';
import { PaginationBar } from './pagination-bar';

const PAGE_SIZES = [10, 25, 50];

/* -------------------------------- Type icon ------------------------------- */

const KIND_STYLES: Record<FileKind, { icon: typeof FileText; className: string }> = {
  pdf: { icon: FileText, className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  docx: { icon: FileText, className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  doc: { icon: FileText, className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  md: { icon: FileCode, className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  html: { icon: FileCode, className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
};

function FileTypeIcon({ kind, className }: { kind: FileKind; className?: string }) {
  const { icon: Icon, className: tone } = KIND_STYLES[kind];
  return (
    <span
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tone, className)}
    >
      <Icon className="size-[18px]" />
    </span>
  );
}

/* ------------------------------- Main screen ------------------------------ */

type TypeFilter = 'all' | FileKind;
type SortKey = 'recent' | 'oldest' | 'name-asc' | 'name-desc' | 'largest' | 'smallest';

const KIND_ORDER: FileKind[] = ['pdf', 'docx', 'doc', 'md', 'html'];

const SORT_LABEL: Record<SortKey, string> = {
  recent: 'Mais recentes',
  oldest: 'Mais antigos',
  'name-asc': 'Nome (A–Z)',
  'name-desc': 'Nome (Z–A)',
  largest: 'Maior arquivo',
  smallest: 'Menor arquivo',
};

const SORTERS: Record<SortKey, (a: ImportedFile, b: ImportedFile) => number> = {
  recent: (a, b) => b.importedAt.localeCompare(a.importedAt),
  oldest: (a, b) => a.importedAt.localeCompare(b.importedAt),
  'name-asc': (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
  'name-desc': (a, b) => b.name.localeCompare(a.name, 'pt-BR'),
  largest: (a, b) => b.sizeBytes - a.sizeBytes,
  smallest: (a, b) => a.sizeBytes - b.sizeBytes,
};

export function ArquivosView() {
  const { files, hydrated } = useArquivos();
  const removeMany = useArquivosStore((s) => s.removeMany);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const all = files;
  const preview = all.find((f) => f.id === previewId) ?? null;

  // Contagem por tipo (dos arquivos totais) para os rótulos das abas.
  const kindCounts = useMemo(() => {
    const counts: Partial<Record<FileKind, number>> = {};
    for (const f of all) counts[f.kind] = (counts[f.kind] ?? 0) + 1;
    return counts;
  }, [all]);
  const presentKinds = KIND_ORDER.filter((k) => (kindCounts[k] ?? 0) > 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((f) => type === 'all' || f.kind === type)
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .sort(SORTERS[sort]);
  }, [all, query, type, sort]);

  const hasActiveFilter = query.trim() !== '' || type !== 'all' || sort !== 'recent';

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Volta pra página 1 quando os filtros mudam.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset ao filtrar
  useEffect(() => setPage(1), [query, type, sort, pageSize]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Mantém a seleção coerente se um arquivo some.
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(files.map((f) => f.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [files]);

  // Selecionar-todos opera sobre a página visível.
  const allSelected = paged.length > 0 && paged.every((f) => selected.has(f.id));
  const someSelected = paged.some((f) => selected.has(f.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const f of paged) next.delete(f.id);
      } else {
        for (const f of paged) next.add(f.id);
      }
      return next;
    });
  }

  function deleteSelected() {
    removeMany([...selected]);
    setSelected(new Set());
  }

  function clearFilters() {
    setQuery('');
    setType('all');
    setSort('recent');
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Arquivos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {all.length} {all.length === 1 ? 'documento' : 'documentos'} — só leitura, consultados
            pelo Explorar.
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <UploadCloud />
          Importar
        </Button>
      </div>

      {all.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome…"
              aria-label="Buscar arquivos"
              className="pl-9"
            />
          </div>

          {presentKinds.length > 0 && (
            <Tabs value={type} onValueChange={(v) => setType(v as TypeFilter)} className="min-w-0">
              <TabsList className="flex-wrap">
                <TabsTrigger value="all">Todos · {all.length}</TabsTrigger>
                {presentKinds.map((k) => (
                  <TabsTrigger key={k} value={k}>
                    {KIND_LABEL[k]} · {kindCounts[k]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>
      )}

      {!hydrated ? (
        <SkeletonList />
      ) : all.length === 0 ? (
        <EmptyState onImport={() => setImportOpen(true)} />
      ) : filtered.length === 0 ? (
        <NoResults onClear={clearFilters} />
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {hasActiveFilter
                ? `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`
                : ''}
            </p>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger size="sm" className="w-auto gap-1.5" aria-label="Ordenar arquivos">
                <ArrowUpDown className="size-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABEL[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border">
            {/* Cabeçalho da lista / barra de seleção */}
            <div className="flex h-12 items-center gap-3 border-b bg-muted/40 px-4">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={toggleAll}
                aria-label="Selecionar todos"
              />
              {selected.size > 0 ? (
                <>
                  <span className="text-sm font-medium">{selected.size} selecionado(s)</span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={deleteSelected}>
                      <Trash2 />
                      Apagar
                    </Button>
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Nome</span>
              )}
            </div>

            <ul>
              {paged.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  selected={selected.has(file.id)}
                  onToggle={() => toggle(file.id)}
                  onPreview={() => setPreviewId(file.id)}
                />
              ))}
            </ul>
          </div>

          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={PAGE_SIZES}
          />
        </>
      )}

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <PreviewDialog file={preview} onClose={() => setPreviewId(null)} />
    </div>
  );
}

/* --------------------------------- Row ------------------------------------ */

function FileRow({
  file,
  selected,
  onToggle,
  onPreview,
}: {
  file: ImportedFile;
  selected: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  const remove = useArquivosStore((s) => s.remove);

  return (
    <li
      className={cn(
        'group flex items-center gap-3 border-b px-4 py-3 last:border-b-0 transition-colors',
        selected ? 'bg-accent/50' : 'hover:bg-accent/30',
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        aria-label={`Selecionar ${file.name}`}
      />
      <FileTypeIcon kind={file.kind} />

      <button type="button" onClick={onPreview} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{KIND_LABEL[file.kind]}</span>
          <span aria-hidden>·</span>
          <span>{formatBytes(file.sizeBytes)}</span>
          <span aria-hidden>·</span>
          <time dateTime={file.importedAt} title={fullDate(file.importedAt)}>
            {relativeDate(file.importedAt)}
          </time>
        </p>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onPreview}>
          <Eye />
          Visualizar
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => remove(file.id)}
          aria-label={`Apagar ${file.name}`}
          className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

/* ------------------------------ Empty state ------------------------------- */

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FolderOpen className="size-5" />
      </span>
      <div>
        <p className="font-display font-medium">Nenhum arquivo importado</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Importe contratos e documentos (PDF, DOCX, MD, HTML) para visualizá-los aqui e
          consultá-los no Explorar.
        </p>
      </div>
      <div className="mt-1">
        <Button onClick={onImport}>
          <UploadCloud />
          Importar arquivos
        </Button>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="mt-6 space-y-3">
      <Skeleton className="h-9 w-full max-w-xs" />
      <div className="overflow-hidden rounded-xl border">
        {Array.from({ length: 4 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders estáticos
          <div key={i} className="flex items-center gap-3 border-b p-4 last:border-b-0">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Search className="size-5" />
      </span>
      <div>
        <p className="font-display font-medium">Nada encontrado</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Nenhum arquivo corresponde à busca e aos filtros.
        </p>
      </div>
      <div className="mt-1">
        <Button variant="outline" onClick={onClear}>
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ Import dialog ----------------------------- */

function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const importFiles = useArquivosStore((s) => s.importFiles);
  const inputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);

  function reset() {
    setStaged([]);
    setDragActive(false);
    setBusy(false);
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const accepted = Array.from(incoming).filter((f) => kindFromName(f.name) !== null);
    setStaged((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      const fresh = accepted.filter((f) => !seen.has(`${f.name}:${f.size}`));
      return [...prev, ...fresh];
    });
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  }

  async function confirmImport() {
    if (staged.length === 0) return;
    setBusy(true);
    await importFiles(staged);
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar documentos</DialogTitle>
          <DialogDescription>
            Arraste os arquivos ou selecione no explorador. Formatos: PDF, DOC, DOCX, MD e HTML.
          </DialogDescription>
        </DialogHeader>

        {/* Zona de drop */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-accent/40',
          )}
        >
          <span
            className={cn(
              'flex size-11 items-center justify-center rounded-full transition-colors',
              dragActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            <UploadCloud className="size-5" />
          </span>
          <span className="text-sm font-medium">
            {dragActive ? 'Solte para adicionar' : 'Arraste arquivos aqui'}
          </span>
          <span className="text-xs text-muted-foreground">
            ou <span className="text-primary underline-offset-2">clique para selecionar</span> —
            múltiplos arquivos
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </button>

        {/* Fila de arquivos selecionados */}
        {staged.length > 0 && (
          <ScrollArea className="max-h-56">
            <ul className="flex flex-col gap-1.5 pr-3">
              {staged.map((file, index) => {
                const kind = kindFromName(file.name) ?? 'pdf';
                return (
                  <li
                    key={`${file.name}:${file.size}`}
                    className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
                  >
                    <FileTypeIcon kind={kind} className="size-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStaged((prev) => prev.filter((_, i) => i !== index))}
                      aria-label={`Remover ${file.name}`}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={confirmImport} disabled={staged.length === 0 || busy}>
            {staged.length > 0 ? `Importar (${staged.length})` : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Preview dialog ---------------------------- */

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

function PreviewDialog({ file, onClose }: { file: ImportedFile | null; onClose: () => void }) {
  const [maximized, setMaximized] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Volta ao tamanho/zoom padrão sempre que reabrir com outro arquivo.
  useEffect(() => {
    if (file) {
      setMaximized(false);
      setZoom(1);
    }
  }, [file]);

  const clamp = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));

  return (
    <Dialog open={file !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0',
          maximized
            ? 'h-svh max-h-svh w-screen max-w-none rounded-none border-0 sm:max-w-none'
            : 'h-[85svh] max-h-[85svh] sm:max-w-3xl',
        )}
      >
        {file && (
          <>
            <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b p-3 pl-4 text-left">
              <FileTypeIcon kind={file.kind} />
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base">{file.name}</DialogTitle>
                <DialogDescription className="mt-0.5 flex items-center gap-1.5">
                  <Badge variant="secondary" className="font-normal">
                    {KIND_LABEL[file.kind]}
                  </Badge>
                  <span>{formatBytes(file.sizeBytes)}</span>
                  <span aria-hidden>·</span>
                  <span>Somente leitura</span>
                </DialogDescription>
              </div>

              {/* Controles de zoom */}
              <div className="flex shrink-0 items-center rounded-md border">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-r-none"
                  onClick={() => setZoom((z) => clamp(z - ZOOM_STEP))}
                  disabled={zoom <= ZOOM_MIN}
                  aria-label="Diminuir zoom"
                >
                  <ZoomOut />
                </Button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="h-8 w-14 border-x text-center text-xs tabular-nums hover:bg-accent"
                  aria-label="Restaurar zoom para 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-l-none"
                  onClick={() => setZoom((z) => clamp(z + ZOOM_STEP))}
                  disabled={zoom >= ZOOM_MAX}
                  aria-label="Aumentar zoom"
                >
                  <ZoomIn />
                </Button>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setMaximized((m) => !m)}
                  aria-label={maximized ? 'Restaurar tamanho' : 'Maximizar'}
                >
                  {maximized ? <Minimize2 /> : <Maximize2 />}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
                  <X />
                </Button>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1">
              <DocumentViewer file={file} zoom={zoom} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
