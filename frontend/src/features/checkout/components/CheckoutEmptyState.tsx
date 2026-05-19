import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '../../../shared/components/EmptyState';

/**
 * Shown when the buyer reaches /checkout with an empty cart — usually
 * because they refreshed after a successful order consumed it, or arrived
 * via a deep link. Calls the buyer back to the catalog.
 */
export function CheckoutEmptyState() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <EmptyState
      title={t('checkout.empty.title')}
      subtitle={t('checkout.empty.subtitle')}
      action={{ label: t('checkout.empty.cta'), onPress: () => void navigate('/') }}
    />
  );
}
