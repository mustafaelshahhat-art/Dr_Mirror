import { Heading, Paragraph, Table } from '@heroui/react';
import { Package } from 'lucide-react';
import { EmptyState } from '../../shared/components/EmptyState';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { OrderStatusBadge } from '../orders/components/OrderStatusBadge';
import { ORDER_STATUSES, type OrderStatus } from '../orders/types';

import { StatusFilterDropdown } from './components/StatusFilterDropdown';
import { useAdminOrdersQuery } from './hooks';
import { QueryErrorState } from '../../shared/components/QueryErrorState';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { TableRowSkeleton, TableSkeletonHeader } from '../../shared/components/TableRowSkeleton';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(() => parseStatusFilter(searchParams.get('status')));
  const [page, setPage] = useState(1);
  const query = useAdminOrdersQuery({ status: statusFilter, page, pageSize: 25 });
  const dateFmt = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  });

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Heading className="text-2xl font-semibold tracking-tight">
            {t('admin.list.title')}
          </Heading>
          <Paragraph className="text-sm text-default-500">{t('admin.list.subtitle')}</Paragraph>
        </div>
        <StatusFilterDropdown
          value={statusFilter}
          onChange={(next) => {
            setStatusFilter(next);
            setPage(1);
            setSearchParams(next === undefined ? {} : { status: String(next) });
          }}
        />
      </header>

      {query.isLoading ? (
        <Table className="rounded-large border border-divider/60">
          <Table.ScrollContainer>
            <Table.Content aria-label={t('admin.list.loading')} aria-busy={true}>
              <TableSkeletonHeader cols={5} label={t('admin.list.loading')} />
              <Table.Body>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={5} />
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : query.isError ? (
        <QueryErrorState
          message={t('admin.list.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data?.items || query.data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t('admin.list.empty.title')}
          subtitle={statusFilter !== undefined
            ? t('admin.list.empty.subtitleFiltered')
            : t('admin.list.empty.subtitle')}
        />
      ) : (
        <>
          {query.data && query.data.totalCount > 0 ? (
            <p className="text-xs text-default-500 tabular-nums">
              {t('admin.list.totalCount', { count: query.data.totalCount })}
            </p>
          ) : null}
          <Table className="rounded-large border border-divider/60">
            <Table.ScrollContainer>
              <Table.Content
                aria-label={t('admin.list.title')}
                aria-busy={query.isFetching}
                onRowAction={(key) => navigate(`/admin/orders/${encodeURIComponent(String(key))}`)}
              >
                <Table.Header>
                  <Table.Column isRowHeader className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400">#</Table.Column>
                  <Table.Column className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400">{t('admin.list.date')}</Table.Column>
                  <Table.Column className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400">{t('admin.list.items')}</Table.Column>
                  <Table.Column className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-default-400">{t('admin.list.status')}</Table.Column>
                  <Table.Column className="px-4 py-3 text-end text-xs font-medium uppercase tracking-wide text-default-400">{t('admin.list.total')}</Table.Column>
                </Table.Header>
                <Table.Body className="divide-y divide-divider/60">
                  {query.data.items.map((order) => (
                    <Table.Row id={order.orderNumber} key={order.id} className="bg-content1 transition-colors hover:bg-content2">
                      <Table.Cell className="px-4 py-3 font-medium">
                        <Link
                          to={`/admin/orders/${encodeURIComponent(order.orderNumber)}`}
                          className="rounded-medium text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          aria-label={t('admin.list.openOrder', { orderNumber: order.orderNumber })}
                        >
                          {order.orderNumber}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="px-4 py-3 tabular-nums text-default-500">{dateFmt.format(new Date(order.createdAt))}</Table.Cell>
                      <Table.Cell className="px-4 py-3 tabular-nums text-default-500">{t('admin.list.itemCount', { count: order.itemCount })}</Table.Cell>
                      <Table.Cell className="px-4 py-3"><OrderStatusBadge status={order.status} /></Table.Cell>
                      <Table.Cell className="px-4 py-3 text-end tabular-nums font-medium">{formatCurrency(order.total, lang)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          <PaginationControls page={page} totalPages={query.data?.totalPages ?? 1} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}

function parseStatusFilter(value: string | null): OrderStatus | undefined {
  if (value === null || value === '') return undefined;

  const numericValue = Number(value);
  const validStatuses = Object.values(ORDER_STATUSES) as OrderStatus[];

  return validStatuses.includes(numericValue as OrderStatus)
    ? (numericValue as OrderStatus)
    : undefined;
}
