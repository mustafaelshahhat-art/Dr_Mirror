import type { ReactNode } from 'react';

export interface AdminPageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  action,
  className = '',
}: AdminPageHeaderProps) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-default-500 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2 mt-2 sm:mt-0">
          {action}
        </div>
      )}
    </div>
  );
}
