import { Skeleton } from '@/components/ui/skeleton';

const TOOLBAR = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const BODY_LINES = [
  { id: 'l1', w: 'w-full' },
  { id: 'l2', w: 'w-11/12' },
  { id: 'l3', w: 'w-4/5' },
  { id: 'l4', w: 'w-full' },
  { id: 'l5', w: 'w-3/4' },
  { id: 'l6', w: 'w-5/6' },
];
const FIELDS = [
  { id: 'f1', label: 'w-16' },
  { id: 'f2', label: 'w-24' },
  { id: 'f3', label: 'w-20' },
  { id: 'f4', label: 'w-16' },
];

/** Placeholder that mirrors DocumentEditor: docked bars + A4 canvas + side panel. */
export function EditorSkeleton() {
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center gap-1.5 border-b bg-card px-2 py-2">
          {TOOLBAR.map((id) => (
            <Skeleton key={id} className="h-8 w-9" />
          ))}
        </div>

        {/* Canvas with an A4 sheet */}
        <div className="editor-desk min-h-0 flex-1 overflow-hidden p-3 sm:p-6 md:p-10">
          <div className="mx-auto aspect-[210/297] w-full max-w-[794px] rounded-sm bg-card p-10 shadow-xl">
            <Skeleton className="h-6 w-1/2" />
            <div className="mt-6 space-y-3">
              {BODY_LINES.map((line) => (
                <Skeleton key={line.id} className={`h-3 ${line.w}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-t-xl border-t bg-card px-4 py-2">
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Right inspector */}
      <aside className="hidden w-72 shrink-0 flex-col border-l bg-sidebar lg:flex">
        <div className="shrink-0 border-b px-4 py-3">
          <div className="font-display text-sm font-semibold tracking-tight">Detalhes</div>
          <p className="text-xs text-muted-foreground">Título, categorias e publicação.</p>
        </div>
        <div className="flex-1 space-y-5 px-4 py-4">
          {FIELDS.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Skeleton className={`h-3 ${field.label}`} />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t px-4 py-3">
          <Skeleton className="h-9 w-full" />
        </div>
      </aside>
    </div>
  );
}
