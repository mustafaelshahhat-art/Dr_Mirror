import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PaginationControls } from '../../../shared/components/PaginationControls';
import { QueryErrorState } from '../../../shared/components/QueryErrorState';
import { TableRowSkeleton } from '../../../shared/components/Skeleton';
import { useAuditLogs } from './hooks';

const ACTION_TYPES = ['OrderStatusChanged', 'PaymentReviewed', 'ProductUpdated', 'UserRoleUpdated'];
const TARGET_TYPES = ['Order', 'Payment', 'Product', 'User'];

export function AuditLogPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState('');
  const [targetType, setTargetType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = {
    page,
    pageSize: 25,
    ...(actionType && { actionType }),
    ...(targetType && { targetType }),
    ...(from && { from }),
    ...(to && { to }),
  };

  const query = useAuditLogs(params);

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  });

  const loadingRows = actionType || targetType || from || to ? 4 : 15;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.audit.title')}</h1>
        <p className="text-sm text-default-500">{t('admin.audit.subtitle')}</p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-default-500">
          {t('admin.audit.filters.actionType')}
          <select
            value={actionType}
            onChange={(e) => { setActionType(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-divider/60 bg-content1 px-2 text-sm text-foreground"
          >
            <option value="">{t('admin.filters.all')}</option>
            {ACTION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-default-500">
          {t('admin.audit.filters.target')}
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-divider/60 bg-content1 px-2 text-sm text-foreground"
          >
            <option value="">{t('admin.filters.all')}</option>
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-default-500">
          {t('admin.audit.filters.from')}
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-divider/60 bg-content1 px-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-default-500">
          {t('admin.audit.filters.to')}
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-divider/60 bg-content1 px-2 text-sm text-foreground"
          />
        </label>
      </div>

      {query.isLoading ? (
        <div
          className="overflow-hidden rounded-large border border-divider/60"
          aria-busy="true"
          aria-label={t('admin.audit.title')}
        >
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: loadingRows }).map((_, i) => (
                <TableRowSkeleton key={i} cols={5} />
              ))}
            </tbody>
          </table>
        </div>
      ) : query.isError ? (
        <QueryErrorState
          message={t('admin.audit.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.items?.length ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-large border border-divider/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider/60 bg-content2 text-start">
                  <th scope="col" className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.audit.columns.timestamp')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.audit.columns.actor')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.audit.columns.action')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.audit.columns.target')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.audit.columns.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {query.data.items.map((entry) => (
                  <tr key={entry.id} className="bg-content1 transition-colors hover:bg-content2">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-default-500">
                      {dateFmt.format(new Date(entry.timestampUtc))}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {entry.actorDisplayName ?? entry.actorUserId}
                    </td>
                    <td className="px-4 py-3 text-default-500">
                      {entry.actionType}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-default-500">
                        {entry.targetEntityType}
                      </span>
                      <span className="ms-1 text-xs text-default-400">
                        #{entry.targetEntityId}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {entry.previousStatus && entry.newStatus ? (
                        <span className="text-xs text-default-500">
                          {entry.previousStatus}
                          {/* eslint-disable-next-line i18next/no-literal-string -- decorative arrow, same in all locales */}
<span className="mx-1 text-default-300">&rarr;</span>
                          {entry.newStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-default-400">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={page}
            totalPages={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <ScrollText className="mx-auto mb-3 size-6 text-default-400" aria-hidden />
          <p className="text-sm text-default-500">{t('admin.audit.empty')}</p>
        </div>
      )}
    </section>
  );
}
