import { buttonVariants } from '@heroui/styles';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

/**
 * Shown when the buyer reaches /checkout with an empty cart — usually
 * because they refreshed after a successful order consumed it, or arrived
 * via a deep link. Calls the buyer back to the catalog.
 */
export function CheckoutEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 rounded-large border border-divider/60 bg-content1 p-10 text-center">
      <h1 className="text-lg font-semibold">{t('checkout.empty.title')}</h1>
      <p className="text-sm text-default-500">{t('checkout.empty.subtitle')}</p>
      <Link to="/" className={buttonVariants({ variant: 'primary' })}>
        {t('checkout.empty.cta')}
      </Link>
    </div>
  );
}
