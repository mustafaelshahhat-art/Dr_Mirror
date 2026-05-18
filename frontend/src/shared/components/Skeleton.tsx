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
import { Skeleton as HeroSkeleton } from '@heroui/react';
import type { ComponentProps } from 'react';

export function Skeleton({ className, ...rest }: ComponentProps<typeof HeroSkeleton>) {
  return (
    <HeroSkeleton
      aria-hidden
      className={[
        'rounded-md bg-default-200/60 motion-safe:animate-pulse',
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
        <Skeleton className="h-5 w-16 rounded-md" />
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

/**
 * Generic table-row skeleton for admin tables. Renders one `<tr>` with `cols`
 * cells; widths cycle through a varied set so a stack of these doesn't look
 * like a single column of identical rectangles. The first cell is wider to
 * mimic the leading name/identifier column most admin tables use.
 */
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  const widths = ['w-40', 'w-24', 'w-20', 'w-16', 'w-28', 'w-12'];
  return (
    <tr className="border-b border-divider/60 last:border-b-0">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${widths[i % widths.length]}`} />
        </td>
      ))}
    </tr>
  );
}

/** Label + value pair used in detail panels (e.g. admin order detail). */
export function DetailFieldSkeleton({ valueClass = 'w-48' }: { valueClass?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className={`h-4 ${valueClass}`} />
    </div>
  );
}

/**
 * Product detail skeleton — gallery on one side, title/price/variant stack on
 * the other. Matches the post-load layout closely enough that the variant
 * picker doesn't drift when the image arrives.
 */
export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="aspect-[4/5] w-full overflow-hidden rounded-large bg-content2" />
      <div className="space-y-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-6 w-28" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-3 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-12" />
            <Skeleton className="h-9 w-12" />
            <Skeleton className="h-9 w-12" />
            <Skeleton className="h-9 w-12" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="pt-4">
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}

/** A single payment-method radio tile placeholder. */
export function PaymentMethodTileSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-medium border border-divider/60 bg-content1 p-3">
      <Skeleton className="mt-1 h-4 w-4 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** Admin KPI list row — label on start, value on end. */
export function KpiRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-10" />
    </div>
  );
}

/** Admin recent-orders row — order number + meta + total. */
export function RecentOrderRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-4 w-16" />
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
