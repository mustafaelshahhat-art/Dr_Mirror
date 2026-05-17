/**
 * Tiny skeleton primitives used while content loads. Pure CSS shimmer (no
 * external dependency) — honors `prefers-reduced-motion` via Tailwind's
 * `motion-safe` variant. Per DESIGN.md: skeletons for *content* loading;
 * spinners only for inline action feedback or page bootstrap.
 *
 * The `Skeleton` block is the atom; the named layouts below assemble those
 * blocks into shapes that match real content rows so layout doesn't shift
 * when data arrives.
 */
import type { HTMLAttributes } from 'react';

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={[
        'rounded bg-default-200/60 motion-safe:animate-pulse',
        className ?? '',
      ].join(' ')}
      {...rest}
    />
  );
}

/** Narrow row used for cart lines, mini-cart, and order rows. */
export function CartLineSkeleton({
  variant = 'page',
}: {
  variant?: 'compact' | 'page';
}) {
  const isCompact = variant === 'compact';
  return (
    <div className="flex gap-3 rounded-medium border border-divider/60 bg-content1 p-3">
      <Skeleton
        className={isCompact ? 'h-16 w-16 shrink-0' : 'h-24 w-20 shrink-0'}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-3 w-1/2" />
        <div className="mt-1 flex items-center justify-between gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}

/** Order list row skeleton — number + meta + status badge + total. */
export function OrderRowSkeleton({ variant = 'page' }: { variant?: 'compact' | 'page' }) {
  const isCompact = variant === 'compact';
  return (
    <div
      className={[
        'flex items-center justify-between gap-3 rounded-medium border border-divider/60 bg-content1',
        isCompact ? 'p-3' : 'p-4',
      ].join(' ')}
    >
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

/** Address card skeleton mirroring the buyer's saved-address card. */
export function AddressCardSkeleton() {
  return (
    <div className="rounded-medium border border-divider/60 bg-content1 p-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  );
}

/** Checkout summary skeleton — line items + totals. */
export function CheckoutSummarySkeleton() {
  return (
    <aside className="h-fit space-y-4 rounded-large border border-divider/60 bg-content1 p-4 lg:sticky lg:top-20">
      <Skeleton className="h-4 w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between gap-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-divider/60 pt-3">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="mt-2 flex justify-between border-t border-divider/60 pt-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </aside>
  );
}
