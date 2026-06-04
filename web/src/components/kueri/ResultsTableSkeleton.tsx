import { Skeleton } from "@/components/ui/skeleton";

const COLS = 6;
const ROWS = 8;

export function ResultsTableSkeleton() {
  return (
    <div className="h-full overflow-auto p-0" aria-busy="true" aria-label="Loading results">
      <div className="border-b border-border bg-surface-1 px-3 py-2 flex gap-3">
        <Skeleton className="h-4 w-8" />
        {Array.from({ length: COLS }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 max-w-[120px]" />
        ))}
      </div>
      {Array.from({ length: ROWS }).map((_, row) => (
        <div key={row} className="flex gap-3 px-3 py-2.5 border-b border-border/60">
          <Skeleton className="h-4 w-6 shrink-0" />
          {Array.from({ length: COLS }).map((_, col) => (
            <Skeleton key={col} className="h-4 flex-1 max-w-[140px]" />
          ))}
        </div>
      ))}
    </div>
  );
}
