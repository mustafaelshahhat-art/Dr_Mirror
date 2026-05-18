import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Sentry } from '../lib/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: info.componentStack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t('common.errorBoundary.title')}
      </h1>
      <p className="max-w-prose text-sm text-default-500">
        {t('common.errorBoundary.subtitle')}
      </p>
      <Button variant="primary" onPress={onReset} className="mt-2">
        {t('common.errorBoundary.retry')}
      </Button>
    </div>
  );
}
