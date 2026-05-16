import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  Package,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import type { OrderStatus } from '../orders/types';
import { ORDER_STATUSES } from '../orders/types';

import { adminOrdersApi } from './api';

const KPI_STATUSES: { key: string; status: OrderStatus }[] = [
  { key: 'pending', status: ORDER_STATUSES.Pending as OrderStatus },
  { key: 'paid', status: ORDER_STATUSES.Paid as OrderStatus },
  { key: 'preparing', status: ORDER_STATUSES.Preparing as OrderStatus },
  { key: 'shipped', status: ORDER_STATUSES.Shipped as OrderStatus },
];

export function AdminHubPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const statsQuery = useQuery({
    queryKey: ['admin', 'orders', 'stats'],
    queryFn: () => adminOrdersApi.stats(),
  });

  const recentQuery = useQuery({
    queryKey: ['admin', 'orders', 'recent'],
    queryFn: () => adminOrdersApi.list({ pageSize: 5 }),
  });

  const stats = statsQuery.data;
  const recentOrders = recentQuery.data?.items ?? [];
  const proofQueueCount = stats?.countsByStatus[ORDER_STATUSES.PendingPaymentReview] ?? 0;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.hub.title')}</h1>
        <p className="text-sm text-default-500">{t('admin.hub.subtitle')}</p>
      </header>

      {statsQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="h-40 animate-pulse rounded-large border border-divider/60 bg-content1" />
          <div className="h-40 animate-pulse rounded-large border border-divider/60 bg-content1" />
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <Link
              to={`/admin/orders?status=${ORDER_STATUSES.PendingPaymentReview}`}
              className="group rounded-large border border-divider/60 bg-content1 p-5 transition-colors hover:bg-content2"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-default-400">
                {t('admin.hub.queue.proofsLabel')}
              </p>
              <p className="mt-3 text-5xl font-bold leading-none tracking-tight text-primary tabular-nums">
                {proofQueueCount}
              </p>
              <p className="mt-3 max-w-prose text-sm text-default-500">
                {t('admin.hub.queue.proofsHelp')}
              </p>
              <span className="mt-5 inline-flex text-sm font-medium text-primary group-hover:underline">
                {t('admin.hub.queue.reviewProofs')}
              </span>
            </Link>

            <div className="rounded-large border border-divider/60 bg-content1 p-4">
              <div className="flex items-center justify-between gap-3 border-b border-divider/60 pb-3">
                <p className="text-sm font-semibold">{t('admin.hub.queue.statusHeading')}</p>
                <span className="text-xs text-default-500 tabular-nums">
                  {t('admin.hub.queue.totalOrders', { count: stats.totalOrders })}
                </span>
              </div>
              <dl className="divide-y divide-divider/60">
                <StatusRow label={t('admin.hub.kpis.pendingReview')} value={proofQueueCount} emphasis />
                {KPI_STATUSES.map(({ key, status }) => (
                  <StatusRow
                    key={key}
                    label={t(`admin.hub.kpis.${key}`)}
                    value={stats.countsByStatus[status] ?? 0}
                  />
                ))}
              </dl>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-3">
              <h2 className="text-base font-semibold">{t('admin.hub.recent.heading')}</h2>
              {recentQuery.isLoading ? (
                <div className="h-32 animate-pulse rounded-large border border-divider/60 bg-content1" />
              ) : recentOrders.length === 0 ? (
                <div className="rounded-large border border-divider/60 bg-content1 p-6 text-center text-sm text-default-500">
                  {t('admin.hub.recent.empty')}
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.slice(0, 5).map((o) => (
                    <Link
                      key={o.orderNumber}
                      to={`/admin/orders/${o.orderNumber}`}
                      className="flex items-center justify-between rounded-medium border border-divider/60 bg-content1 px-4 py-3 text-sm transition-colors hover:bg-content2"
                    >
                      <span className="font-medium text-foreground">
                        {o.orderNumber}
                      </span>
                      <span className="tabular-nums text-default-500">
                        {t('admin.list.itemCount', { count: o.itemCount })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {t('admin.hub.recent.viewAll')}
              </Link>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-semibold">{t('admin.hub.quickLinks')}</h2>
              <div className="space-y-2">
                <QuickLink to="/admin/orders" icon={ClipboardList} label={t('admin.shell.nav.orders')} />
                <QuickLink to="/admin/products" icon={Package} label={t('admin.shell.nav.products')} />
                <QuickLink to="/admin/users" icon={Users} label={t('admin.shell.nav.users')} />
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="flex items-center justify-between border-t border-divider/60 pt-4 text-xs text-default-400">
        <span>
          {t('admin.shell.accountMenu.signedInAs', { name: user?.fullName ?? '' })}
        </span>
      </div>
    </section>
  );
}

function StatusRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className={emphasis ? 'text-sm font-medium text-foreground' : 'text-sm text-default-500'}>
        {label}
      </dt>
      <dd
        className={
          emphasis
            ? 'text-base font-semibold text-primary tabular-nums'
            : 'text-sm font-medium text-foreground tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Package;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-medium border border-divider/60 bg-content1 px-3 py-2 text-sm text-default-700 transition-colors hover:bg-content2 dark:text-default-300"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
