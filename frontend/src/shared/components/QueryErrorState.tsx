import { Alert, Button } from '@heroui/react';
import { AlertCircle } from 'lucide-react';

interface QueryErrorStateProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

export function QueryErrorState({ message, retryLabel, onRetry }: QueryErrorStateProps) {
  return (
    <Alert
      status="danger"
      role="alert"
      className="enter-fade"
    >
      <Alert.Indicator>
        <AlertCircle size={16} aria-hidden className="shrink-0" />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
      <Button variant="ghost" size="sm" onPress={onRetry} className="shrink-0 text-danger">
        {retryLabel}
      </Button>
    </Alert>
  );
}
