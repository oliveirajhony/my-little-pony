import { Skeleton } from '@/components/ui/skeleton';

const CARDS = ['a', 'b', 'c', 'd', 'e', 'f'];
const TITLE_WIDTHS = ['w-4/5', 'w-2/3', 'w-3/4', 'w-4/5', 'w-3/5', 'w-2/3'];

/** Placeholder that mirrors DocumentsView so the real grid swaps in without shift. */
export function DocumentsGridSkeleton() {
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-full sm:max-w-xs" />
        <Skeleton className="h-9 w-64" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((id, i) => (
          <div key={id} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="size-6 rounded-md" />
            </div>
            <Skeleton className={`mt-3 h-4 ${TITLE_WIDTHS[i]}`} />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <Skeleton className="mt-3 h-3.5 w-full" />
            <Skeleton className="mt-1.5 h-3.5 w-2/3" />
            <div className="mt-4 flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
