import { Button } from '@heroui/react';

interface QueryErrorStateProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

export function QueryErrorState({ message, retryLabel, onRetry }: QueryErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-large border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
    >
      <span>{message}</span>
      <Button variant="ghost" size="sm" onPress={onRetry} className="shrink-0 text-danger">
        {retryLabel}
      </Button>
    </div>
  );
}
