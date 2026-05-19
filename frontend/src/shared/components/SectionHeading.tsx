import type { ReactNode } from 'react';

export interface SectionHeadingProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}

export function SectionHeading({
  title,
  description,
  action,
  as: Tag = 'h2',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={[
        'flex items-baseline justify-between gap-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        <Tag className="text-base font-semibold tracking-tight sm:text-lg">{title}</Tag>
        {description && (
          <span className="text-sm text-default-500">{description}</span>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
