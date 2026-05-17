import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  ClipboardList,
  Inbox,
  Package,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import type { OrderStatus } from '../orders/types';
import { ORDER_STATUSES } from '../orders/types';
import {
  KpiRowSkeleton,
  RecentOrderRowSkeleton,
  Skeleton,
} from '../../shared/components/Skeleton';

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
        <div className="space-y-6" aria-busy="true" aria-label={t('admin.hub.subtitle')}>
          <div className="overflow-hidden rounded-large border border-divider/60 bg-content1">
            <div className="flex items-center justify-between gap-3 border-b border-divider/60 px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="divide-y divide-divider/60">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-4 w-8" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <KpiRowSkeleton key={i} />
              ))}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-2 overflow-hidden rounded-large border border-divider/60 bg-content1 divide-y divide-divider/60">
                {Array.from({ length: 5 }).map((_, i) => (
                  <RecentOrderRowSkeleton key={i} />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </div>
        </div>
      ) : stats ? (
        <>
          <div className="overflow-hidden rounded-large border border-divider/60 bg-content1">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider/60 px-4 py-3">
              <p className="text-sm font-semibold">{t('admin.hub.queue.statusHeading')}</p>
              <span className="text-xs text-default-500 tabular-nums">
                {t('admin.hub.queue.totalOrders', { count: stats.totalOrders })}
              </span>
            </div>
            <div className="divide-y divide-divider/60">
              <Link
                to={`/admin/orders?status=${ORDER_STATUSES.PendingPaymentReview}`}
                aria-label={t('admin.hub.queue.reviewProofs')}
                className="group flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-content2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-default-500">
                    {t('admin.hub.queue.proofsLabel')}
                  </span>
                  <span className="mt-0.5 block text-xs text-default-500">
                    {t('admin.hub.queue.proofsHelp')}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {proofQueueCount}
                  </span>
                  <ChevronRight
                    className="size-4 text-default-400 rtl:rotate-180"
                    aria-hidden
                  />
                </span>
              </Link>
              <dl className="divide-y divide-divider/60">
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
                <div className="rounded-large border border-divider/60 bg-content1 p-6 text-center">
                  <Inbox className="mx-auto mb-2 size-6 text-default-400" aria-hidden />
                  <p className="text-sm text-default-500">{t('admin.hub.recent.empty')}</p>
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
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-default-500">{label}</dt>
      <dd className="text-sm font-medium text-foreground tabular-nums">
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
