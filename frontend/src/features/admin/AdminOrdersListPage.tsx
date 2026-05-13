import { Spinner } from '@heroui/react';
import { Package } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { OrderStatusBadge } from '../orders/components/OrderStatusBadge';
import type { OrderStatus } from '../orders/types';

import { StatusFilterDropdown } from './components/StatusFilterDropdown';
import { useAdminOrdersQuery } from './hooks';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';

/**
 * Admin's order queue at <c>/admin/orders</c>. Filterable by status; lists
 * everything most-recent first. Each row links to the admin detail view
 * where the actual state-machine transitions and proof reviews happen.
 */
export function AdminOrdersListPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined);
  const query = useAdminOrdersQuery({ status: statusFilter, page: 1, pageSize: 50 });
  const dateFmt = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  });

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('admin.list.title')}
          </h1>
          <p className="text-sm text-default-500">{t('admin.list.subtitle')}</p>
        </div>
        <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
      </header>

      {query.isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner aria-label={t('admin.list.loading')} />
        </div>
      ) : query.isError ? (
        <div className="rounded-large border border-danger/30 bg-danger/10 p-6 text-sm text-danger">
          {t('admin.list.errorLoad')}
        </div>
      ) : !query.data || query.data.length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <Package className="mx-auto mb-3 size-10 text-default-400" aria-hidden />
          <h2 className="text-base font-semibold">{t('admin.list.empty.title')}</h2>
          <p className="mt-1 text-sm text-default-500">
            {statusFilter !== undefined
              ? t('admin.list.empty.subtitleFiltered')
              : t('admin.list.empty.subtitle')}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {query.data.map((order) => (
            <li key={order.id}>
              <Link
                to={`/admin/orders/${encodeURIComponent(order.orderNumber)}`}
                className="flex items-center justify-between gap-3 rounded-medium border border-divider/60 bg-content1 p-4 transition-colors hover:bg-content2"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-default-500 tabular-nums">
                    {dateFmt.format(new Date(order.createdAt))} ·{' '}
                    {t('admin.list.itemCount', { count: order.itemCount })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <OrderStatusBadge status={order.status} />
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(order.total, lang)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
