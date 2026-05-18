import { toast } from '@heroui/react/toast';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';

import { lookupErrorKey } from '../lib/api-error-map';
import { Sentry } from '../lib/sentry';

interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
}

export function useApiErrorToast() {
  const { t } = useTranslation('errors');

  return (error: unknown) => {
    const signal = getErrorSignal(error);
    const key = lookupErrorKey(signal.status, signal.title, signal.type);

    Sentry.addBreadcrumb({
      category: 'api-error',
      level: 'warning',
      data: signal,
    });

    try {
      toast.danger(t(key));
    } catch {
      // ToastProvider can be unavailable during early boot; breadcrumb is enough.
    }
  };
}

function getErrorSignal(error: unknown) {
  if (isAxiosError<ProblemDetails>(error)) {
    const problem = error.response?.data;
    return {
      status: error.response?.status ?? problem?.status,
      title: problem?.title,
      type: problem?.type,
      detail: problem?.detail,
    };
  }

  if (error instanceof Error) {
    return { detail: error.message };
  }

  return {};
}
