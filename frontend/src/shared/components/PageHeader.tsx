import type { ReactNode } from 'react';

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  as?: 'h1' | 'h2';
  align?: 'start' | 'center';
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  as: Tag = 'h1',
  align = 'start',
  className,
}: PageHeaderProps) {
  const alignClass = align === 'center' ? 'items-center text-center' : 'items-start text-start';

  return (
    <div className={['page-header', alignClass, className].filter(Boolean).join(' ')}>
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-wide text-default-500">{eyebrow}</p>
      )}
      <div
        className={[
          'flex w-full gap-4',
          action ? 'flex-row flex-wrap items-center justify-between' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Tag className="page-title">{title}</Tag>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  );
}
