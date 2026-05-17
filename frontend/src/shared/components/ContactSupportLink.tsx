import { useTranslation } from 'react-i18next';

import { useAppConfigQuery } from '../../features/orders/hooks';

/**
 * Renders a mailto: link to the support inbox configured at
 * <c>Support:ContactEmail</c> on the backend. When the value is unset, the
 * component renders nothing — surfaces fall back to plain copy without a
 * broken affordance.
 *
 * Surfaces using this:
 *  - Checkout payment-method empty state (when admin disabled every method).
 */
export function ContactSupportLink({ className }: { className?: string }) {
  const { t } = useTranslation();
  const config = useAppConfigQuery();
  const email = config.data?.support.contactEmail ?? null;
  if (!email) return null;
  return (
    <a
      href={`mailto:${email}`}
      dir="ltr"
      className={['text-sm text-primary underline-offset-2 hover:underline', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {t('contactSupport')}
    </a>
  );
}
