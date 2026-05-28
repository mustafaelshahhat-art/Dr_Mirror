import type { ReactNode } from 'react';

export interface AdminFiltersBarProps {
  search?: ReactNode;
  filters?: ReactNode;
  className?: string;
}

export function AdminFiltersBar({
  search,
  filters,
  className = '',
}: AdminFiltersBarProps) {
  return (
    <div
      className={`flex flex-col gap-4 p-4 border border-divider/40 bg-content1 rounded-2xl shadow-sm md:flex-row md:items-center md:justify-between ${className}`}
    >
      {search && (
        <div className="w-full md:max-w-xs lg:max-w-md flex-1">
          {search}
        </div>
      )}
      {filters && (
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
          {filters}
        </div>
      )}
    </div>
  );
}
