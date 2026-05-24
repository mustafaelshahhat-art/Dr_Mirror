import { Table } from '@heroui/react';
import { ArchiveRestore } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { TableRowSkeleton, TableSkeletonHeader } from '../../shared/components/TableRowSkeleton';
import type { AppLang } from '../../shared/lib/theme-storage';
import { ReturnStatusBadge } from '../orders/components/ReturnStatusBadge';
import { RETURN_STATUSES, type ReturnStatus } from '../orders/types';

import { AdminReturnsListMobileCards } from './AdminReturnsListMobileCards';
import { ReturnStatusFilterDropdown } from './components/ReturnStatusFilterDropdown';
import { useAdminReturnsQuery } from './hooks';

export function AdminReturnsListPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | undefined>(() => parseStatusFilter(searchParams.get('status')));
  const [page, setPage] = useState(1);
  const query = useAdminReturnsQuery({ status: statusFilter, page, pageSize: 25 });
  const dateFmt = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  });

  return (
    <section className="space-y-8">
      <PageHeader
        title={t('admin.returns.list.title')}
        subtitle={t('admin.returns.list.subtitle')}
        action={
          <ReturnStatusFilterDropdown
            value={statusFilter}
            onChange={(next) => {
              setStatusFilter(next);
              setPage(1);
              setSearchParams(next === undefined ? {} : { status: String(next) });
            }}
          />
        }
      />

      {query.isLoading ? (
        <Table className="rounded-large border border-divider/60">
          <Table.ScrollContainer>
            <Table.Content aria-label={t('admin.returns.list.loading')} aria-busy={true}>
              <TableSkeletonHeader cols={5} label={t('admin.returns.list.loading')} />
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
          message={t('admin.returns.list.error')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data?.items || query.data.items.length === 0 ? (
        <EmptyState
          icon={ArchiveRestore}
          title={t('admin.returns.list.empty.title')}
          subtitle={statusFilter !== undefined
            ? t('returns.eligibility.none')
            : t('admin.returns.list.empty.subtitle')}
        />
      ) : (
        <>
          {query.data && query.data.totalCount > 0 ? (
            <p className="text-xs text-default-500 tabular-nums">
              {t('admin.list.totalCount', { count: query.data.totalCount })}
            </p>
          ) : null}
          <div className="hidden sm:block">
            <Table className="rounded-large border border-divider/60">
              <Table.ScrollContainer>
                <Table.Content
                  aria-label={t('admin.returns.list.title')}
                  aria-busy={query.isFetching}
                  onRowAction={(key) => navigate(`/admin/returns/${encodeURIComponent(String(key))}`)}
                >
                  <Table.Header>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.returns.list.cols.status')}</Table.Column>
                    <Table.Column isRowHeader className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.returns.list.cols.orderNumber')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.returns.list.cols.customer')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.returns.list.cols.date')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.returns.list.cols.reason')}</Table.Column>
                  </Table.Header>
                  <Table.Body className="divide-y divide-divider/60">
                    {query.data.items.map((item) => (
                      <Table.Row id={item.id} key={item.id} className="bg-content1 transition-colors hover:bg-content2">
                        <Table.Cell className="px-4 py-3"><ReturnStatusBadge status={item.status} /></Table.Cell>
                        <Table.Cell className="px-4 py-3 font-medium">
                          <Link
                            to={`/admin/returns/${encodeURIComponent(item.id)}`}
                            className="rounded-medium text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            {item.orderNumber}
                          </Link>
                        </Table.Cell>
                        <Table.Cell className="px-4 py-3 text-default-700 font-medium">{item.buyerFullName}</Table.Cell>
                        <Table.Cell className="px-4 py-3 tabular-nums text-default-500">{dateFmt.format(new Date(item.createdAt))}</Table.Cell>
                        <Table.Cell className="px-4 py-3 text-default-500 truncate max-w-xs">{item.customerReason}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
          <div className="sm:hidden">
            <AdminReturnsListMobileCards returns={query.data.items} lang={lang} />
          </div>
          <PaginationControls page={page} totalPages={query.data?.totalPages ?? 1} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}

function parseStatusFilter(value: string | null): ReturnStatus | undefined {
  if (value === null || value === '') return undefined;

  const validStatuses = Object.values(RETURN_STATUSES) as ReturnStatus[];
  return validStatuses.includes(value as ReturnStatus)
    ? (value as ReturnStatus)
    : undefined;
}
