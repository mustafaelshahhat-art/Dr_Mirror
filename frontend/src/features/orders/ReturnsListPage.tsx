import { Card } from '@heroui/react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { Skeleton } from '../../shared/components/Skeleton';
import { ReturnStatusBadge } from './components/ReturnStatusBadge';
import { useAllMyReturnsQuery } from './hooks';

export function ReturnsListPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useAllMyReturnsQuery(page, 10);
  const dateFmt = new Intl.DateTimeFormat(
    i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US',
    { dateStyle: 'medium' },
  );

  if (query.isLoading) {
    return (
      <section className="space-y-8" aria-busy="true" aria-label={t('returns.list.loading')}>
        <header className="space-y-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </header>
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-28 w-full rounded-2xl" />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="space-y-8">
        <Link to="/account" className="back-link">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t('addresses.backToAccount')}
        </Link>
        <PageHeader title={t('returns.list.title')} subtitle={t('returns.list.subtitle')} />
        <QueryErrorState
          message={t('returns.list.error')}
          retryLabel={t('common.query.retry')}
          onRetry={() => void query.refetch()}
        error={query.error}
        />
      </section>
    );
  }

  const returns = query.data?.items ?? [];

  return (
    <section className="space-y-8">
      <Link to="/account" className="back-link">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('addresses.backToAccount')}
      </Link>

      <PageHeader title={t('returns.list.title')} subtitle={t('returns.list.subtitle')} />

      {returns.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title={t('returns.list.empty')}
          action={{ label: t('returns.list.emptyAction'), onPress: () => void navigate('/account/orders') }}
        />
      ) : (
        <ul className="space-y-3" aria-busy={query.isFetching}>
          {returns.map((r) => (
            <li key={r.id}>
              <Link to={`/account/orders/${encodeURIComponent(r.orderNumber)}`} className="block">
                <Card className="border border-divider/60 transition-colors hover:bg-content2">
                  <Card.Content className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {t('returns.list.orderLabel', { number: r.orderNumber })}
                      </span>
                      <ReturnStatusBadge status={r.status} />
                    </div>
                    {r.items.length > 0 ? (
                      <p className="text-xs text-default-500">
                        {r.items.map((item) => {
                          const name = i18n.language.startsWith('ar') ? item.nameAr : item.nameEn;
                          return `${name} × ${item.quantity}`;
                        }).join(' · ')}
                      </p>
                    ) : null}
                    {r.customerReason ? (
                      <p className="text-sm text-default-700 dark:text-default-300 line-clamp-2">
                        {r.customerReason}
                      </p>
                    ) : null}
                    <p className="text-xs text-default-500">
                      {t('returns.list.submittedOn', { date: dateFmt.format(new Date(r.createdAt)) })}
                    </p>
                  </Card.Content>
                </Card>
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
