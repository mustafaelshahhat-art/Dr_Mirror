import { Inbox, type LucideIcon } from 'lucide-react';
import { Button } from '@heroui/react';

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
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon className="size-12 text-default-300" aria-hidden />
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        {subtitle && <p className="text-sm text-default-500">{subtitle}</p>}
      </div>
      {action && (
        <Button variant="primary" onPress={action.onPress}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
