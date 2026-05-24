import { useState } from 'react';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { OrderRowSkeleton, Skeleton } from '../../shared/components/Skeleton';

import { OrderStatusBadge } from './components/OrderStatusBadge';
import { useMyOrdersQuery } from './hooks';

/**
 * Buyer's order list at <c>/account/orders</c>. Newest first. Each row
 * links to the order detail page. Empty state nudges back to the catalog.
 */
export function OrdersListPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const [page, setPage] = useState(1);
  const query = useMyOrdersQuery(page, 20);
  const dateFmt = new Intl.DateTimeFormat(
    i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US',
    { dateStyle: 'medium', numberingSystem: 'latn' },
  );

  if (query.isLoading) {
    return (
      <section className="space-y-8" aria-busy="true" aria-label={t('orders.list.loading')}>
        <header className="space-y-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </header>
        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i}>
              <OrderRowSkeleton />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (query.isError) {
    return (
      <QueryErrorState
        message={t('orders.list.errorLoad')}
        retryLabel={t('common.query.retry')}
        onRetry={() => void query.refetch()}
      error={query.error}
        />
    );
  }

  const orders = query.data?.items ?? [];

  return (
    <section className="space-y-8">
      <PageHeader title={t('orders.list.title')} subtitle={t('orders.list.subtitle')} />

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t('orders.list.empty.title')}
          subtitle={t('orders.list.empty.subtitle')}
          action={{ label: t('orders.list.empty.cta'), onPress: () => void navigate('/') }}
        />
      ) : (
        <ul className="content-surface overflow-hidden" aria-busy={query.isFetching}>
          {orders.map((order, idx) => (
            <li key={order.id} className={idx > 0 ? 'border-t border-divider/40' : ''}>
              <Link
                to={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
                className="flex flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-surface-secondary sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5"
              >
                <div className="flex items-center justify-between gap-2 sm:min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {order.orderNumber}
                  </p>
                  <span className="shrink-0 sm:hidden">
                    <OrderStatusBadge status={order.status} />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <p className="text-xs font-medium tabular-nums text-muted">
                    {dateFmt.format(new Date(order.createdAt))} ·{' '}
                    {t('orders.list.itemCount', { count: order.itemCount })}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="hidden shrink-0 sm:block">
                      <OrderStatusBadge status={order.status} />
                    </span>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {formatCurrency(order.total, lang)}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {query.data && query.data.totalPages > 1 ? (
        <PaginationControls
          page={page}
          totalPages={query.data.totalPages}
          onPageChange={setPage}
        />
      ) : null}
    </section>
  );
}
