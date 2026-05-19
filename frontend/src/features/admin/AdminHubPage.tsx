import { Heading } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../shared/components/PageHeader';
import { Stat } from '../../shared/components/Stat';
import {
  ChevronRight,
  ClipboardList,
  Inbox,
  Package,
  ScrollText,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { EmptyState } from '../../shared/components/EmptyState';

import { useAuth } from '../auth/useAuth';
import type { OrderStatus } from '../orders/types';
import { ORDER_STATUSES } from '../orders/types';
import { queryKeys } from '../../shared/lib/query-keys';
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
    queryKey: queryKeys.admin.orders.stats(),
    queryFn: () => adminOrdersApi.stats(),
  });

  const recentQuery = useQuery({
    queryKey: queryKeys.admin.orders.recent(),
    queryFn: () => adminOrdersApi.list({ pageSize: 5 }),
  });

  const stats = statsQuery.data;
  const recentOrders = recentQuery.data?.items ?? [];
  const proofQueueCount = stats?.countsByStatus[ORDER_STATUSES.PendingPaymentReview] ?? 0;

  return (
    <section className="space-y-8">
      <PageHeader title={t('admin.hub.title')} subtitle={t('admin.hub.subtitle')} />

      {statsQuery.isLoading ? (
        <div className="space-y-6" aria-busy="true" aria-label={t('admin.hub.subtitle')}>
          <div className="content-surface overflow-hidden">
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
              <div className="content-surface divide-y divide-divider/60 overflow-hidden space-y-2">
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
          <div className="content-surface overflow-hidden">
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
                className="group flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
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
              <div className="cq p-3">
                <div className="grid gap-2 @md:grid-cols-2 @lg:grid-cols-4">
                  {KPI_STATUSES.map(({ key, status }) => (
                    <Stat
                      key={key}
                      label={t(`admin.hub.kpis.${key}`)}
                      value={String(stats.countsByStatus[status] ?? 0)}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-3">
              <Heading level={2} className="text-sm font-semibold uppercase tracking-wide text-muted">{t('admin.hub.recent.heading')}</Heading>
              {recentQuery.isLoading ? (
                <Skeleton className="h-32 rounded-large" />
              ) : recentOrders.length === 0 ? (
                <EmptyState icon={Inbox} title={t('admin.hub.recent.empty')} />
              ) : (
                <div className="content-surface overflow-hidden" aria-busy={recentQuery.isFetching}>
                  {recentOrders.slice(0, 5).map((o, idx) => (
                    <Link
                      key={o.orderNumber}
                      to={`/admin/orders/${o.orderNumber}`}
                      className={[
                        'flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-surface-secondary',
                        idx > 0 ? 'border-t border-divider/40' : '',
                      ].join(' ')}
                    >
                      <span className="font-medium text-foreground">
                        {o.orderNumber}
                      </span>
                      <span className="flex items-center gap-2 tabular-nums text-muted">
                        {t('admin.list.itemCount', { count: o.itemCount })}
                        <ChevronRight className="size-3.5 text-default-300 rtl:rotate-180" aria-hidden />
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                {t('admin.hub.recent.viewAll')}
                <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden />
              </Link>
            </div>

            <div className="space-y-3">
              <Heading level={2} className="text-sm font-semibold uppercase tracking-wide text-muted">{t('admin.hub.quickLinks')}</Heading>
              <div className="flex flex-col gap-1.5">
                <QuickLink to="/admin/orders" icon={ClipboardList} label={t('admin.shell.nav.orders')} />
                <QuickLink to="/admin/products" icon={Package} label={t('admin.shell.nav.products')} />
                <QuickLink to="/admin/users" icon={Users} label={t('admin.shell.nav.users')} />
                <QuickLink to="/admin/audit" icon={ScrollText} label={t('admin.shell.nav.audit')} />
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
      className="content-surface flex items-center gap-2 px-3 py-2 text-sm text-default-700 transition-colors hover:bg-surface-secondary dark:text-default-300"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
