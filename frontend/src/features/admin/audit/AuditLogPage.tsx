import type { DateValue } from '@internationalized/date';
import { parseDate } from '@internationalized/date';
import { Calendar, DateField, DatePicker, Label, Table } from '@heroui/react';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PaginationControls } from '../../../shared/components/PaginationControls';
import { QueryErrorState } from '../../../shared/components/QueryErrorState';
import { EmptyState } from '../../../shared/components/EmptyState';
import { TableRowSkeleton, TableSkeletonHeader } from '../../../shared/components/TableRowSkeleton';
import { SelectField } from '../../../shared/components/SelectField';
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
    <section className="space-y-8">
      <header className="page-header">
        <h1 className="page-title">{t('admin.audit.title')}</h1>
        <p className="page-subtitle">{t('admin.audit.subtitle')}</p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          label={t('admin.audit.filters.actionType')}
          value={actionType}
          emptyLabel={t('admin.filters.all')}
          options={ACTION_TYPES.map((a) => ({ value: a, label: a }))}
          onChange={(next) => { setActionType(next); setPage(1); }}
          isFilter
          className="min-w-40"
        />
        <SelectField
          label={t('admin.audit.filters.target')}
          value={targetType}
          emptyLabel={t('admin.filters.all')}
          options={TARGET_TYPES.map((t) => ({ value: t, label: t }))}
          onChange={(next) => { setTargetType(next); setPage(1); }}
          isFilter
          className="min-w-40"
        />
        <AuditDateFilter
          label={t('admin.audit.filters.from')}
          value={from}
          onChange={(next) => { setFrom(next); setPage(1); }}
        />
        <AuditDateFilter
          label={t('admin.audit.filters.to')}
          value={to}
          onChange={(next) => { setTo(next); setPage(1); }}
        />
      </div>

      {query.isLoading ? (
        <Table className="rounded-large border border-divider/60">
          <Table.ScrollContainer>
            <Table.Content aria-label={t('admin.audit.title')} aria-busy={true}>
              <TableSkeletonHeader cols={5} label={t('admin.audit.title')} />
              <Table.Body>
                {Array.from({ length: loadingRows }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={5} />
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : query.isError ? (
        <QueryErrorState
          message={t('admin.audit.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.items?.length ? (
        <div className="space-y-4">
          <Table className="rounded-large border border-divider/60">
            <Table.ScrollContainer>
              <Table.Content aria-label={t('admin.audit.title')} aria-busy={query.isFetching}>
                <Table.Header>
                  <Table.Column isRowHeader className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.audit.columns.timestamp')}
                  </Table.Column>
                  <Table.Column className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.audit.columns.actor')}
                  </Table.Column>
                  <Table.Column className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.audit.columns.action')}
                  </Table.Column>
                  <Table.Column className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.audit.columns.target')}
                  </Table.Column>
                  <Table.Column className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-default-400">
                    {t('admin.audit.columns.status')}
                  </Table.Column>
                </Table.Header>
                <Table.Body className="divide-y divide-divider/60">
                  {query.data.items.map((entry) => (
                    <Table.Row key={entry.id} className="bg-content1 transition-colors hover:bg-content2">
                      <Table.Cell className="whitespace-nowrap px-4 py-3 tabular-nums text-default-500">
                        {dateFmt.format(new Date(entry.timestampUtc))}
                      </Table.Cell>
                      <Table.Cell className="px-4 py-3 font-medium text-foreground">
                        {entry.actorDisplayName ?? entry.actorUserId}
                      </Table.Cell>
                      <Table.Cell className="px-4 py-3 text-default-500">
                        {entry.actionType}
                      </Table.Cell>
                      <Table.Cell className="px-4 py-3">
                        <span className="text-xs font-medium text-default-500">
                          {entry.targetEntityType}
                        </span>
                        <span className="ms-1 text-xs text-default-400">
                          #{entry.targetEntityId}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="whitespace-nowrap px-4 py-3">
                        {entry.previousStatus && entry.newStatus ? (
                          <span className="text-xs text-default-500">
                            {entry.previousStatus}
                            {/* eslint-disable-next-line i18next/no-literal-string -- decorative arrow, same in all locales */}
                            <span className="mx-1 text-default-300">&rarr;</span>
                            {entry.newStatus}
                          </span>
                        ) : (
                          <span aria-hidden className="text-xs text-default-400">·</span>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          <PaginationControls
            page={page}
            totalPages={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <EmptyState icon={ScrollText} title={t('admin.audit.empty')} />
      )}
    </section>
  );
}

function AuditDateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const parsedValue = value ? parseDate(value) : null;

  return (
    <DatePicker
      value={parsedValue}
      onChange={(next: DateValue | null) => onChange(next?.toString() ?? '')}
      className="min-w-44"
    >
      <Label className="text-xs uppercase tracking-wide text-default-500">{label}</Label>
      <DateField.Group className="flex items-center justify-between w-full h-10 px-4 text-xs font-semibold border border-default-200/60 bg-default-100/30 dark:bg-default-50/10 hover:border-brand/40 hover:bg-brand/5 dark:hover:bg-brand/10 focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all duration-300 rounded-full cursor-pointer text-default-700 dark:text-default-300">
        <DateField.Input>
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger className="text-default-400 hover:text-brand transition-colors duration-200 cursor-pointer">
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover className="border border-default-200/60 bg-background/85 backdrop-blur-md shadow-lg rounded-large overflow-hidden">
        <Calendar aria-label={label}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            {/* eslint-disable-next-line i18next/no-literal-string -- React Aria calendar slot, not user copy */}
            <Calendar.NavButton slot="previous" />
            {/* eslint-disable-next-line i18next/no-literal-string -- React Aria calendar slot, not user copy */}
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}
