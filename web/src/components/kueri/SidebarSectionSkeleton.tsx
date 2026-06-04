import { Skeleton } from "@/components/ui/skeleton";

export function SidebarSectionSkeleton() {
  return (
    <div className="px-2 py-3 space-y-3" aria-busy="true" aria-label="Loading sidebar">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-4/5" />
      <Skeleton className="h-3 w-28 mt-4" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
