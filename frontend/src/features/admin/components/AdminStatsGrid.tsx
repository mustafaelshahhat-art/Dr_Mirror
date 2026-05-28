import type { ReactNode } from 'react';

export interface AdminStatsGridProps {
  children: ReactNode;
  cols?: 3 | 4 | 5;
  className?: string;
}

export function AdminStatsGrid({
  children,
  cols = 4,
  className = '',
}: AdminStatsGridProps) {
  const colsClass =
    cols === 5
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
      : cols === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-2 lg:grid-cols-4';

  return (
    <div className={`grid gap-4 ${colsClass} ${className}`}>
      {children}
    </div>
  );
}
