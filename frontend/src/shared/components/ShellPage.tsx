import { LayoutDashboard, MapPin, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';

/**
 * Authenticated account landing. Mounted at <c>/account</c> behind
 * <c>ProtectedRoute</c>. M2 ships the bare minimum — name, email, role —
 * with placeholders for the buyer-flow features (orders, addresses,
 * inquiries) that arrive in M3+.
 */
export function ShellPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('account.welcome', { name: user.fullName })}
        </h1>
        <p className="max-w-prose text-sm text-default-500">
          {t('account.subtitle')}
        </p>
      </section>

      <section className="rounded-large border border-divider/60 bg-content1 p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-default-500">
              {t('account.fields.fullName')}
            </dt>
            <dd className="mt-1 text-sm font-medium">{user.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-default-500">
              {t('account.fields.email')}
            </dt>
            <dd className="mt-1 text-sm font-medium" dir="ltr">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-default-500">
              {t('account.fields.role')}
            </dt>
            <dd className="mt-1 text-sm font-medium">{user.roles.join(', ')}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="quick-links" className="grid gap-3 sm:grid-cols-2">
        <h2 id="quick-links" className="sr-only">
          {t('account.quickLinks')}
        </h2>
        <Link
          to="/account/orders"
          className="group flex items-center gap-3 rounded-large border border-divider/60 bg-content1 p-4 transition-colors hover:bg-content2"
        >
          <span className="grid size-10 place-items-center rounded-medium bg-primary/10 text-primary">
            <Package className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              {t('account.myOrders.title')}
            </span>
            <span className="block text-xs text-default-500">
              {t('account.myOrders.subtitle')}
            </span>
          </span>
        </Link>

        <Link
          to="/account/addresses"
          className="group flex items-center gap-3 rounded-large border border-divider/60 bg-content1 p-4 transition-colors hover:bg-content2"
        >
          <span className="grid size-10 place-items-center rounded-medium bg-success/10 text-success">
            <MapPin className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              {t('account.addresses.title')}
            </span>
            <span className="block text-xs text-default-500">
              {t('account.addresses.subtitle')}
            </span>
          </span>
        </Link>

        {user.roles.includes('Admin') ? (
          <Link
            to="/admin"
            className="group flex items-center gap-3 rounded-large border border-divider/60 bg-content1 p-4 transition-colors hover:bg-content2"
          >
            <span className="grid size-10 place-items-center rounded-medium bg-secondary/10 text-secondary">
              <LayoutDashboard className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {t('account.adminDashboard.title')}
              </span>
              <span className="block text-xs text-default-500">
                {t('account.adminDashboard.subtitle')}
              </span>
            </span>
          </Link>
        ) : null}
      </section>

    </div>
  );
}
