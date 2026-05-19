import { Skeleton } from '../../../shared/components/Skeleton';

/**
 * 12-card placeholder grid for the initial load.
 */
export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-large border border-divider/60 bg-content1"
        >
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
