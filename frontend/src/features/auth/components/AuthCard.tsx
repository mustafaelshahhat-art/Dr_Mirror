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
    <Card className="w-full max-w-md border border-divider/70 bg-content1/95 shadow-sm">
      <Card.Header className="flex flex-col items-stretch gap-2 px-6 pb-0 pt-6 text-center sm:px-8 sm:pt-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-sm leading-relaxed text-default-400">{subtitle}</p>
        ) : null}
      </Card.Header>
      <Card.Content className="gap-6 px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
        {children}
        {footer ? <div className="text-center text-sm text-default-500">{footer}</div> : null}
      </Card.Content>
    </Card>
  );
}
