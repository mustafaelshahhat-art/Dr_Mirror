import { Button } from '@heroui/react';
import { isAxiosError } from 'axios';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../../auth/types';
import { QueryErrorState } from '../../../shared/components/QueryErrorState';
import { PaymentMethodTileSkeleton } from '../../../shared/components/Skeleton';

import { PaymentMethodForm } from './components/payment-methods/PaymentMethodForm';
import { PaymentMethodRow } from './components/payment-methods/PaymentMethodRow';

import {
  useAdminPaymentMethodsQuery,
  useCreatePaymentMethodMutation,
  useTogglePaymentMethodActiveMutation,
  useUpdatePaymentMethodMutation,
} from './hooks';

export function AdminPaymentMethodsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar') ?? false;
  const query = useAdminPaymentMethodsQuery();
  const createMutation = useCreatePaymentMethodMutation();
  const updateMutation = useUpdatePaymentMethodMutation();
  const toggleMutation = useTogglePaymentMethodActiveMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <section
        className="space-y-5"
        aria-busy="true"
        aria-label={t('admin.payments.loading')}
      >
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('admin.payments.title')}</h1>
          <p className="text-sm text-default-500">{t('admin.payments.subtitle')}</p>
        </header>
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <PaymentMethodTileSkeleton />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t('admin.payments.title')}</h1>
            <p className="text-sm text-default-500">{t('admin.payments.subtitle')}</p>
          </div>
        </header>
        <QueryErrorState
          message={t('admin.payments.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        />
      </section>
    );
  }

  const methods = query.data ?? [];

  function handleError(err: unknown) {
    const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
    setServerError(
      problem?.detail ?? problem?.title ?? t('admin.payments.errors.unknown'),
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('admin.payments.title')}</h1>
          <p className="text-sm text-default-500">{t('admin.payments.subtitle')}</p>
        </div>
        {!creating ? (
          <Button variant="primary" size="sm" onPress={() => setCreating(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" aria-hidden />
              {t('admin.payments.actions.new')}
            </span>
          </Button>
        ) : null}
      </header>

      {serverError ? (
        <div role="alert" className="rounded-medium border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {serverError}
        </div>
      ) : null}

      {creating ? (
        <PaymentMethodForm
          mode="create"
          onCancel={() => setCreating(false)}
          isPending={createMutation.isPending}
          onSubmit={async (body) => {
            setServerError(null);
            try {
              await createMutation.mutateAsync(body);
              setCreating(false);
              return true;
            } catch (err) {
              handleError(err);
              return false;
            }
          }}
        />
      ) : null}

      {methods.length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center text-sm text-default-500">
          {t('admin.payments.empty')}
        </div>
      ) : (
        <ul className="space-y-2">
          {methods.map((m) => (
            <li key={m.id}>
              {editingId === m.id ? (
                <PaymentMethodForm
                  mode="edit"
                  initial={m}
                  onCancel={() => setEditingId(null)}
                  isPending={updateMutation.isPending}
                  onSubmit={async (body) => {
                    setServerError(null);
                    try {
                      await updateMutation.mutateAsync({ id: m.id, body });
                      setEditingId(null);
                      return true;
                    } catch (err) {
                      handleError(err);
                      return false;
                    }
                  }}
                />
              ) : (
                <PaymentMethodRow
                  method={m}
                  isAr={isAr}
                  isToggling={toggleMutation.isPending}
                  onEdit={() => setEditingId(m.id)}
                  onToggleActive={async () => {
                    setServerError(null);
                    try {
                      await toggleMutation.mutateAsync({
                        id: m.id,
                        activate: !m.isActive,
                      });
                    } catch (err) {
                      handleError(err);
                    }
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
