import { Table } from '@heroui/react';

import { Skeleton } from './Skeleton';


/**
 * Generic table-row skeleton for admin tables. Composes HeroUI Table + Skeleton
 * per Anatomy A.2 and A.20 without pulling Table into non-table skeleton users.
 */
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  const widths = ['w-40', 'w-24', 'w-20', 'w-16', 'w-28', 'w-12'];

  return (
    <Table.Row className="border-b border-divider/60 last:border-b-0">
      {Array.from({ length: cols }).map((_, i) => (
        <Table.Cell key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${widths[i % widths.length]} rounded-lg`} />
        </Table.Cell>
      ))}
    </Table.Row>
  );
}

export function TableSkeletonHeader({ cols = 4, label }: { cols?: number; label: string }) {
  return (
    <Table.Header>
      {Array.from({ length: cols }).map((_, i) => (
        <Table.Column key={i} className="sr-only">
          {label}
        </Table.Column>
      ))}
    </Table.Header>
  );
}
