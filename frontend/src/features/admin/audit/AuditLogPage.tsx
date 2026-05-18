import type { DateValue } from '@internationalized/date';
import { parseDate } from '@internationalized/date';
import { Calendar, DateField, DatePicker, Label, ListBox, Select } from '@heroui/react';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PaginationControls } from '../../../shared/components/PaginationControls';
import { QueryErrorState } from '../../../shared/components/QueryErrorState';
import { TableRowSkeleton } from '../../../shared/components/Skeleton';
import { useAuditLogs } from './hooks';

const ACTION_TYPES = ['OrderStatusChanged', 'PaymentReviewed', 'ProductUpdated', 'UserRoleUpdated'];
const TARGET_TYPES = ['Order', 'Payment', 'Product', 'User'];
const ALL_FILTER_VALUE = '__all__';

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
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.audit.title')}</h1>
        <p className="text-sm text-default-500">{t('admin.audit.subtitle')}</p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <AuditSelectFilter
          label={t('admin.audit.filters.actionType')}
          value={actionType}
          allLabel={t('admin.filters.all')}
          options={ACTION_TYPES}
          onChange={(next) => { setActionType(next); setPage(1); }}
        />
        <AuditSelectFilter
          label={t('admin.audit.filters.target')}
          value={targetType}
          allLabel={t('admin.filters.all')}
          options={TARGET_TYPES}
          onChange={(next) => { setTargetType(next); setPage(1); }}
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
            <table className="w-full text-sm" aria-busy={query.isFetching}>
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
                        <span aria-hidden className="text-xs text-default-400">·</span>
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
          <ScrollText className="enter-fade-up mx-auto mb-3 size-6 text-default-400" aria-hidden />
          <p className="enter-fade-up text-sm text-default-500">{t('admin.audit.empty')}</p>
        </div>
      )}
    </section>
  );
}

function AuditSelectFilter({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <Select
      value={value || ALL_FILTER_VALUE}
      onChange={(next: unknown) => onChange(next === ALL_FILTER_VALUE || next == null ? '' : String(next))}
      variant="secondary"
      selectionMode="single"
      className="min-w-40"
    >
      <Label className="text-xs font-medium text-default-500">{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id={ALL_FILTER_VALUE} textValue={allLabel}>{allLabel}</ListBox.Item>
          {options.map((option) => (
            <ListBox.Item key={option} id={option} textValue={option}>{option}</ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
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
      <Label className="text-xs font-medium text-default-500">{label}</Label>
      <DateField.Group>
        <DateField.Input>
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
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
