import { Bell, LayoutDashboard, MapPin, Package, RotateCcw, ShoppingBag } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { useMyOrdersQuery } from '../../features/orders/hooks';
import { ORDER_STATUSES, type OrderStatus } from '../../features/orders/types';

import { OrderRowSkeleton } from './Skeleton';

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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const ordersQuery = useMyOrdersQuery(1, 3);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(
      i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US',
      { dateStyle: 'long' },
    ),
    [i18n.language],
  );

  if (!user) return null;

  const createdAt = user.createdAt ? dateFmt.format(new Date(user.createdAt)) : null;
  const orders = ordersQuery.data?.items ?? [];

  const initials = user.fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="space-y-8">
      {/* Account identity header */}
      <section className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-lg font-bold text-brand">
          {initials}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t('common.account.welcome', { name: user.fullName })}
          </h1>
          <p className="mt-0.5 text-sm text-muted">{user.email}</p>
          {createdAt ? (
            <p className="mt-0.5 text-xs text-default-500">
              {t('account.account.memberSince', { date: createdAt })}
            </p>
          ) : null}
        </div>
      </section>

      {/* Navigation rail */}
      <section aria-labelledby="quick-links" className="grid gap-3 sm:grid-cols-2">
        <h2 id="quick-links" className="sr-only">
          {t('common.account.quickLinks')}
        </h2>
        <Link
          to="/account/orders"
          className="group flex items-center gap-3 content-surface p-4 transition-colors hover:bg-surface-secondary"
        >
          <span className="grid size-10 place-items-center rounded-medium bg-primary/10 text-primary">
            <Package className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-foreground">
              {t('common.account.myOrders.title')}
            </span>
            <span className="block text-sm text-default-500">
              {t('common.account.myOrders.subtitle')}
            </span>
          </span>
        </Link>

        <Link
          to="/account/addresses"
          className="group flex items-center gap-3 content-surface p-4 transition-colors hover:bg-surface-secondary"
        >
          <span className="grid size-10 place-items-center rounded-medium bg-default-200 text-default-600 dark:bg-default-100/10 dark:text-default-400">
            <MapPin className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-foreground">
              {t('common.account.addresses.title')}
            </span>
            <span className="block text-sm text-default-500">
              {t('common.account.addresses.subtitle')}
            </span>
          </span>
        </Link>

        <Link
          to="/account/returns"
          className="group flex items-center gap-3 content-surface p-4 transition-colors hover:bg-surface-secondary"
        >
          <span className="grid size-10 place-items-center rounded-medium bg-default-200 text-default-600 dark:bg-default-100/10 dark:text-default-400">
            <RotateCcw className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-foreground">
              {t('common.account.myReturns.title')}
            </span>
            <span className="block text-sm text-default-500">
              {t('common.account.myReturns.subtitle')}
            </span>
          </span>
        </Link>

        <Link
          to="/account/notifications"
          className="group flex items-center gap-3 content-surface p-4 transition-colors hover:bg-surface-secondary"
        >
          <span className="grid size-10 place-items-center rounded-medium bg-default-200 text-default-600 dark:bg-default-100/10 dark:text-default-400">
            <Bell className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-foreground">
              {t('common.account.notifications.title')}
            </span>
            <span className="block text-sm text-default-500">
              {t('common.account.notifications.subtitle')}
            </span>
          </span>
        </Link>

        {user.roles.includes('Admin') ? (
          <Link
            to="/admin"
            className="group flex items-center gap-3 content-surface p-4 transition-colors hover:bg-surface-secondary"
          >
            <span className="grid size-10 place-items-center rounded-medium bg-default-200 text-default-700 dark:bg-default-100/10 dark:text-default-500">
              <LayoutDashboard className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
            <span className="block text-base font-semibold text-foreground">
              {t('common.account.adminDashboard.title')}
            </span>
            <span className="block text-sm text-default-500">
                {t('common.account.adminDashboard.subtitle')}
              </span>
            </span>
          </Link>
        ) : null}
      </section>

      <section aria-labelledby="recent-orders" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-orders" className="flex items-center gap-2 text-base font-semibold">
            <ShoppingBag className="size-4" aria-hidden />
            {t('account.account.recentOrders.title')}
          </h2>
        </div>

        {ordersQuery.isLoading ? (
          <ul
            className="space-y-2"
            aria-busy="true"
            aria-label={t('account.account.loading')}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <OrderRowSkeleton variant="compact" />
              </li>
            ))}
          </ul>
        ) : orders.length > 0 ? (
          <ul className="content-surface divide-y divide-divider/40 overflow-hidden">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/account/orders/${order.orderNumber}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-secondary"
                >
                  <span className="text-sm font-medium">
                    {t('account.account.recentOrders.orderLabel', { number: order.orderNumber })}
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
                className="flex items-center justify-center border-t border-divider/40 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-surface-secondary"
              >
                {t('account.account.recentOrders.viewAll')}
              </Link>
            </li>
          </ul>
        ) : (
          <div className="content-surface p-8 text-center">
            <ShoppingBag className="mx-auto mb-2 size-6 text-default-400" aria-hidden />
            <p className="text-sm text-default-500">{t('account.account.recentOrders.empty')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
