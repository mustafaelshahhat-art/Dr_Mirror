import type { ReactNode } from 'react';
import { Card } from '@heroui/react';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="w-full max-w-sm border border-divider/60 bg-surface shadow-md sm:max-w-md">
      <Card.Header className="flex flex-col items-stretch gap-1.5 px-6 pb-0 pt-7 text-center sm:px-8 sm:pt-9">
        <h1 className="text-[1.375rem] font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-sm leading-relaxed text-muted">{subtitle}</p>
        ) : null}
      </Card.Header>
      <Card.Content className="gap-5 px-6 pb-7 pt-6 sm:px-8 sm:pb-9">
        {children}
        {footer ? (
          <div className="border-t border-divider/50 pt-4 text-center text-sm text-muted">
            {footer}
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}
