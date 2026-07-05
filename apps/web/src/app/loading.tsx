import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="grid min-h-svh place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
