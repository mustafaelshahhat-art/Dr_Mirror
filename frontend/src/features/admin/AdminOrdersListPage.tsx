import { Spinner } from '@heroui/react';
import { Package } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { OrderStatusBadge } from '../orders/components/OrderStatusBadge';
import type { OrderStatus } from '../orders/types';

import { StatusFilterDropdown } from './components/StatusFilterDropdown';
import { useAdminOrdersQuery } from './hooks';
import { QueryErrorState } from './components/QueryErrorState';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';
import { PaginationControls } from '../../shared/components/PaginationControls';

/**
 * Admin's order queue at <c>/admin/orders</c>. Filterable by status; lists
 * everything most-recent first. Each row links to the admin detail view
 * where the actual state-machine transitions and proof reviews happen.
 */
export function AdminOrdersListPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const query = useAdminOrdersQuery({ status: statusFilter, page, pageSize: 25 });
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
        <StatusFilterDropdown value={statusFilter} onChange={(next) => { setStatusFilter(next); setPage(1); }} />
      </header>

      {query.isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner aria-label={t('admin.list.loading')} />
        </div>
      ) : query.isError ? (
        <QueryErrorState
          message={t('admin.list.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data?.items || query.data.items.length === 0 ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <Package className="mx-auto mb-3 size-6 text-default-400" aria-hidden />
          <h2 className="text-base font-semibold">{t('admin.list.empty.title')}</h2>
          <p className="mt-1 text-sm text-default-500">
            {statusFilter !== undefined
              ? t('admin.list.empty.subtitleFiltered')
              : t('admin.list.empty.subtitle')}
          </p>
        </div>
      ) : (
        <>
          {query.data && query.data.totalCount > 0 ? (
            <p className="text-xs text-default-500 tabular-nums">
              {t('admin.list.totalCount', { count: query.data.totalCount })}
            </p>
          ) : null}
          <div className="overflow-hidden rounded-large border border-divider/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-content2">
                  <th scope="col" className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400">#</th>
                  <th scope="col" className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400">{t('admin.list.date')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400">{t('admin.list.items')}</th>
                  <th scope="col" className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400">{t('admin.list.status')}</th>
                  <th scope="col" className="px-4 py-3 text-end text-xs font-medium uppercase tracking-wide text-default-400">{t('admin.list.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/40">
                {query.data.items.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => void navigate(`/admin/orders/${encodeURIComponent(order.orderNumber)}`)}
                    className="cursor-pointer bg-content1 transition-colors hover:bg-content2"
                  >
                    <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                    <td className="px-4 py-3 tabular-nums text-default-500">{dateFmt.format(new Date(order.createdAt))}</td>
                    <td className="px-4 py-3 tabular-nums text-default-500">{t('admin.list.itemCount', { count: order.itemCount })}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-end tabular-nums font-medium">{formatCurrency(order.total, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls page={page} totalPages={query.data?.totalPages ?? 1} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
