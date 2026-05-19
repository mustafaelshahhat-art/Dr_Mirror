// Approved Composition Component — per Anatomy A.1 (Card) + A.24 (Heading / Paragraph).
// HeroUI v3 ships no EmptyState primitive; this file is the Approved Composition Component.
import { Button, Card, Heading, Paragraph } from '@heroui/react';
import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: EmptyStateAction;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  subtitle,
  action,
}: EmptyStateProps) {
  return (
    <Card variant="transparent" className="py-14 sm:py-16">
      <Card.Content className="flex flex-col items-center gap-4 text-center">
        <div className="enter-fade-up flex size-16 items-center justify-center rounded-2xl bg-default-100 dark:bg-default-50/5">
          <Icon className="size-8 text-default-400" aria-hidden />
        </div>
        <div className="enter-fade-up space-y-1.5">
          <Heading level={2} className="text-base font-semibold text-foreground">{title}</Heading>
          {subtitle && <Paragraph className="mx-auto max-w-xs text-sm leading-relaxed text-muted">{subtitle}</Paragraph>}
        </div>
        {action && (
          <Button variant="primary" onPress={action.onPress} className="mt-1">
            {action.label}
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}
