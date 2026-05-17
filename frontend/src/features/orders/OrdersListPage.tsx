import { useState } from 'react';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { LinkButton } from '../../shared/components/LinkButton';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { OrderRowSkeleton, Skeleton } from '../../shared/components/Skeleton';

import { OrderStatusBadge } from './components/OrderStatusBadge';
import { useMyOrdersQuery } from './hooks';

/**
 * Buyer's order list at <c>/account/orders</c>. Newest first. Each row
 * links to the order detail page. Empty state nudges back to the catalog.
 */
export function OrdersListPage() {
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
      <section className="space-y-5" aria-busy="true" aria-label={t('orders.list.loading')}>
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
      />
    );
  }

  const orders = query.data?.items ?? [];

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('orders.list.title')}</h1>
        <p className="text-sm text-default-500">{t('orders.list.subtitle')}</p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <Package className="mx-auto mb-3 size-6 text-default-400" aria-hidden />
          <h2 className="text-base font-semibold">{t('orders.list.empty.title')}</h2>
          <p className="mt-1 text-sm text-default-500">{t('orders.list.empty.subtitle')}</p>
          <LinkButton
            to="/"
            className="mt-4"
          >
            {t('orders.list.empty.cta')}
          </LinkButton>
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
                className="flex items-center justify-between gap-3 rounded-medium border border-divider/60 bg-content1 p-4 transition-colors hover:bg-content2"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-default-500 tabular-nums">
                    {dateFmt.format(new Date(order.createdAt))} ·{' '}
                    {t('orders.list.itemCount', { count: order.itemCount })}
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
