import { Alert, Button } from '@heroui/react';
import { CreditCard } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { usePaymentMethodsQuery } from '../../orders/hooks';
import { ContactSupportLink } from '../../../shared/components/ContactSupportLink';
import { PaymentMethodTileSkeleton } from '../../../shared/components/Skeleton';
import { PaymentMethodPicker } from './PaymentMethodPicker';

interface PaymentMethodSectionProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  /**
   * Reports whether the buyer can actually proceed from this step — false on
   * loading, error, or true-empty (admin has disabled every method). The
   * parent uses this to gate the Continue button.
   */
  onAvailabilityChange?: (available: boolean) => void;
}

/**
 * Wraps PaymentMethodPicker with shape-matched loading skeletons, a retry
 * banner on fetch error, and a localized empty state when admin has disabled
 * every payment method.
 */
export function PaymentMethodSection({
  selectedId,
  onSelect,
  onAvailabilityChange,
}: PaymentMethodSectionProps) {
  const { t } = useTranslation();
  const query = usePaymentMethodsQuery();

  const methods = query.data ?? [];
  const available = !query.isLoading && !query.isError && methods.length > 0;

  useEffect(() => {
    onAvailabilityChange?.(available);
  }, [available, onAvailabilityChange]);

  if (query.isLoading) {
    return (
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label={t('checkout.payment.loading')}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <PaymentMethodTileSkeleton key={i} rounded />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert status="danger" role="alert" className="rounded-xl">
        <Alert.Content>
          <Alert.Description>{t('checkout.payment.errorLoad')}</Alert.Description>
        </Alert.Content>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => void query.refetch()}
          className="shrink-0 rounded-xl text-danger"
        >
          {t('checkout.payment.retry')}
        </Button>
      </Alert>
    );
  }

  if (methods.length === 0) {
    return (
      <div
        role="status"
        className="space-y-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-4 text-sm text-warning-700 dark:text-warning"
      >
        <div className="flex items-center gap-2 font-medium">
          <CreditCard className="size-4 shrink-0" aria-hidden />
          {t('checkout.payment.empty.title')}
        </div>
        <p className="text-xs text-default-500">{t('checkout.payment.empty.help')}</p>
        <ContactSupportLink className="block pt-1" />
      </div>
    );
  }

  return (
    <PaymentMethodPicker
      methods={methods}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}
