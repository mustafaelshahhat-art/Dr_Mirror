// Approved Composition Component — per Anatomy A.1 (Card) + A.24 (Heading / Paragraph).
// HeroUI v3 ships no EmptyState primitive; this file is the Approved Composition Component.
import { Button, Card, Heading, Paragraph } from '@heroui/react';
import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: EmptyStateAction;
  secondaryAction?: ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  subtitle,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <Card variant="transparent" className="py-14 sm:py-16">
      <Card.Content className="flex flex-col items-center gap-4 text-center">
        <div className="enter-fade-up flex size-16 items-center justify-center rounded-2xl bg-brand-subtle">
          <Icon className="size-7 text-brand" aria-hidden />
        </div>
        <div className="enter-fade-up space-y-1.5">
          <Heading level={2} className="text-lg font-semibold text-foreground">{title}</Heading>
          {subtitle && <Paragraph className="mx-auto max-w-xs text-sm leading-relaxed text-muted sm:text-base">{subtitle}</Paragraph>}
        </div>
        {(action || secondaryAction) && (
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            {action && (
              <Button variant="primary" onPress={action.onPress}>
                {action.label}
              </Button>
            )}
            {secondaryAction}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
