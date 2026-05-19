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
    <Card variant="transparent" className="py-16">
      <Card.Content className="flex flex-col items-center gap-3 text-center">
        <Icon className="size-12 text-default-300" aria-hidden />
        <div className="space-y-1">
          <Heading level={2} className="text-base font-medium text-foreground">{title}</Heading>
          {subtitle && <Paragraph className="text-sm text-default-500">{subtitle}</Paragraph>}
        </div>
        {action && (
          <Button variant="primary" onPress={action.onPress}>
            {action.label}
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}
