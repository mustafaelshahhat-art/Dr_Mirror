import { useEffect } from 'react';
import { Alert, Button } from '@heroui/react';
import { AlertCircle } from 'lucide-react';
import * as Sentry from '@sentry/react';

interface QueryErrorStateProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  /** The raw error object. When provided, fires Sentry.captureException on render. */
  error?: unknown;
}

export function QueryErrorState({ message, retryLabel, onRetry, error }: QueryErrorStateProps) {
  useEffect(() => {
    if (error !== undefined && error !== null) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <Alert
      status="danger"
      role="alert"
      className="enter-fade-down rounded-large"
    >
      <Alert.Indicator>
        <AlertCircle size={16} aria-hidden className="mt-0.5 shrink-0" />
      </Alert.Indicator>
      <Alert.Content className="flex-1">
        <Alert.Description className="text-sm">{message}</Alert.Description>
      </Alert.Content>
      <Button variant="ghost" size="sm" onPress={onRetry} className="shrink-0 self-center text-danger">
        {retryLabel}
      </Button>
    </Alert>
  );
}
