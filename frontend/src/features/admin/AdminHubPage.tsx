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
  { key: 'pendingReview', status: ORDER_STATUSES.PendingPaymentReview as OrderStatus },
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

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.hub.title')}</h1>
        <p className="text-sm text-default-500">{t('admin.hub.subtitle')}</p>
      </header>

      {statsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-large border border-divider/60 bg-content1 p-4"
            />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label={t('admin.hub.kpis.total')}
              value={stats.totalOrders}
              tone="primary"
            />
            {KPI_STATUSES.map(({ key, status }) => (
              <KpiCard
                key={key}
                label={t(`admin.hub.kpis.${key}`)}
                value={stats.countsByStatus[status] ?? 0}
                tone="default"
              />
            ))}
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

            <aside className="space-y-3">
              <h2 className="text-base font-semibold">{t('admin.hub.quickLinks')}</h2>
              <div className="space-y-2">
                <QuickLink to="/admin/orders" icon={ClipboardList} label={t('admin.shell.nav.orders')} />
                <QuickLink to="/admin/products" icon={Package} label={t('admin.shell.nav.products')} />
                <QuickLink to="/admin/users" icon={Users} label={t('admin.shell.nav.users')} />
              </div>
            </aside>
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

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'primary' | 'default';
}) {
  return (
    <div className="rounded-large border border-divider/60 bg-content1 p-4">
      <p className="text-xs text-default-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === 'primary' ? 'text-primary' : 'text-foreground'
        }`}
      >
        {value}
      </p>
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
