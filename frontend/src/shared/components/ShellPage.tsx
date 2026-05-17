import { LayoutDashboard, MapPin, Package, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { useMyOrdersQuery } from '../../features/orders/hooks';
import { ORDER_STATUSES, type OrderStatus } from '../../features/orders/types';

import { OrderRowSkeleton } from './Skeleton';

const dateFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'long',
  numberingSystem: 'latn',
});

const STATUS_I18N_KEY: Record<OrderStatus, string> = {
  [ORDER_STATUSES.Pending]: 'pending',
  [ORDER_STATUSES.Confirmed]: 'confirmed',
  [ORDER_STATUSES.PendingPaymentReview]: 'pendingPaymentReview',
  [ORDER_STATUSES.Paid]: 'paid',
  [ORDER_STATUSES.Preparing]: 'preparing',
  [ORDER_STATUSES.Shipped]: 'shipped',
  [ORDER_STATUSES.Delivered]: 'delivered',
  [ORDER_STATUSES.Cancelled]: 'cancelled',
};

export function ShellPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const ordersQuery = useMyOrdersQuery(1, 3);

  if (!user) return null;

  const createdAt = user.createdAt ? dateFmt.format(new Date(user.createdAt)) : null;
  const orders = ordersQuery.data?.items ?? [];

  return (
    <div className="space-y-8">
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
          {createdAt ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-default-500">
                {t('account.memberSince')}
              </dt>
              <dd className="mt-1 text-sm font-medium">{createdAt}</dd>
            </div>
          ) : null}
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
          <span className="grid size-10 place-items-center rounded-medium bg-default-200 text-default-600 dark:bg-default-100/10 dark:text-default-400">
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
            <span className="grid size-10 place-items-center rounded-medium bg-default-200 text-default-600 dark:bg-default-100/10 dark:text-default-400">
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

      <section aria-labelledby="recent-orders" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-orders" className="flex items-center gap-2 text-base font-semibold">
            <ShoppingBag className="size-4" aria-hidden />
            {t('account.recentOrders.title')}
          </h2>
        </div>

        {ordersQuery.isLoading ? (
          <ul
            className="space-y-2"
            aria-busy="true"
            aria-label={t('account.loading')}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <OrderRowSkeleton variant="compact" />
              </li>
            ))}
          </ul>
        ) : orders.length > 0 ? (
          <ul className="divide-y divide-divider/40 overflow-hidden rounded-large border border-divider/60">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/account/orders/${order.orderNumber}`}
                  className="flex items-center justify-between gap-4 bg-content1 px-4 py-3 transition-colors hover:bg-content2"
                >
                  <span className="text-sm font-medium">
                    {t('account.recentOrders.orderLabel', { number: order.orderNumber })}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-default-500">
                    <span className="tabular-nums">{dateFmt.format(new Date(order.createdAt))}</span>
                    <span className="tabular-nums">{t('orders.status.' + STATUS_I18N_KEY[order.status])}</span>
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/account/orders"
                className="flex items-center justify-center bg-content1 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-content2"
              >
                {t('account.recentOrders.viewAll')}
              </Link>
            </li>
          </ul>
        ) : (
          <div className="rounded-large border border-divider/60 bg-content1 p-8 text-center">
            <ShoppingBag className="mx-auto mb-2 size-6 text-default-400" aria-hidden />
            <p className="text-sm text-default-500">{t('account.recentOrders.empty')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
