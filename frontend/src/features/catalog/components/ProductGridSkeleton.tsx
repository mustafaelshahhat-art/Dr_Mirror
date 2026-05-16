/**
 * 12-card placeholder grid for the initial load. Pure CSS shimmer so we don't
 * pull in a skeleton dependency. Honors prefers-reduced-motion via Tailwind's
 * built-in motion-safe variant.
 */
export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-large border border-divider/60 bg-content1"
        >
          <div className="aspect-[4/5] w-full bg-default-200/60 motion-safe:animate-pulse" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 rounded bg-default-200/60 motion-safe:animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-default-200/60 motion-safe:animate-pulse" />
            <div className="h-3 w-1/4 rounded bg-default-200/60 motion-safe:animate-pulse" />
            <div className="flex items-center justify-between pt-2">
              <div className="h-4 w-1/3 rounded bg-default-200/60 motion-safe:animate-pulse" />
              <div className="h-5 w-1/4 rounded bg-default-200/60 motion-safe:animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
