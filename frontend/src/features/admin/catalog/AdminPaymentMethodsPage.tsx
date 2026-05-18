import { Button } from '@heroui/react';
import { CreditCard, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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

  if (query.isLoading) {
    return (
      <section
        className="space-y-8"
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
      <section className="space-y-8">
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

  return (
    <section className="space-y-8">
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

      {creating ? (
        // eslint-disable-next-line i18next/no-literal-string -- programmatic form mode, not user copy
        <PaymentMethodForm mode="create"
          onCancel={() => setCreating(false)}
          isPending={createMutation.isPending}
          onSubmit={async (body) => {
            try {
              await createMutation.mutateAsync(body);
              setCreating(false);
              return true;
            } catch {
              // Toast emitted by mutation onError.
              return false;
            }
          }}
        />
      ) : null}

      {methods.length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <CreditCard className="enter-fade-up mx-auto mb-3 size-6 text-default-400" aria-hidden />
          <p className="enter-fade-up text-sm text-default-500">{t('admin.payments.empty')}</p>
        </div>
      ) : (
        <ul
          className="space-y-2"
          aria-busy={
            query.isFetching ||
            createMutation.isPending ||
            updateMutation.isPending ||
            toggleMutation.isPending
          }
        >
          {methods.map((m) => (
            <li key={m.id}>
              {editingId === m.id ? (
                // eslint-disable-next-line i18next/no-literal-string -- programmatic form mode, not user copy
                <PaymentMethodForm mode="edit"
                  initial={m}
                  onCancel={() => setEditingId(null)}
                  isPending={updateMutation.isPending}
                  onSubmit={async (body) => {
                    try {
                      await updateMutation.mutateAsync({ id: m.id, body });
                      setEditingId(null);
                      return true;
                    } catch {
                      // Toast emitted by mutation onError.
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
                    try {
                      await toggleMutation.mutateAsync({
                        id: m.id,
                        activate: !m.isActive,
                      });
                    } catch {
                      // Toast emitted by mutation onError.
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
