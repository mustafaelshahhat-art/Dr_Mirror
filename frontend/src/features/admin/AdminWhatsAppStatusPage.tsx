import { Button, Chip, Spinner, Table } from '@heroui/react';
import { MessageCircle, QrCode } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '../../shared/components/PageHeader';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { TableRowSkeleton, TableSkeletonHeader } from '../../shared/components/TableRowSkeleton';
import { queryKeys } from '../../shared/lib/query-keys';
import { adminWhatsAppApi } from './api';
import type { WhatsAppAttemptDto } from './types';

const PAGE_SIZE = 20;

export function AdminWhatsAppStatusPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const statusQuery = useQuery({
    queryKey: queryKeys.admin.whatsapp.status(),
    queryFn: adminWhatsAppApi.getWhatsAppStatus,
    refetchInterval: 30_000,
  });
  const attemptsQuery = useQuery({
    queryKey: queryKeys.admin.whatsapp.attempts(page, PAGE_SIZE),
    queryFn: () => adminWhatsAppApi.getWhatsAppAttempts(page, PAGE_SIZE),
  });
  const dateFmt = new Intl.DateTimeFormat(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  });

  return (
    <section className="space-y-8">
      <PageHeader
        title={t('admin.whatsapp.status.title')}
        subtitle={t('admin.whatsapp.status.subtitle')}
        action={statusQuery.data?.qrRequired ? (
          <Button variant="primary" onPress={() => navigate('/admin/whatsapp/pair')}>
            <QrCode className="size-4" aria-hidden />
            {t('admin.whatsapp.status.pairDevice')}
          </Button>
        ) : undefined}
      />

      {statusQuery.isLoading ? (
        <div className="content-surface flex items-center gap-3 p-5 text-sm text-default-500">
          <Spinner size="sm" />
          {t('admin.whatsapp.status.loading')}
        </div>
      ) : statusQuery.isError ? (
        <QueryErrorState
          message={t('admin.whatsapp.status.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void statusQuery.refetch()}
          error={statusQuery.error}
        />
      ) : statusQuery.data ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatusCard
            label={t('admin.whatsapp.status.connection')}
            value={
              <div className="flex flex-col gap-1">
                <ConnectionChip state={statusQuery.data.connectionState} />
                {statusQuery.data.lastError ? (
                  <p className="text-xs text-danger-500">
                    {t(`admin.whatsapp.errors.${statusQuery.data.lastError}`, { defaultValue: statusQuery.data.lastError })}
                  </p>
                ) : null}
              </div>
            }
          />
          <StatusCard label={t('admin.whatsapp.status.sent')} value={statusQuery.data.counts.sent} />
          <StatusCard label={t('admin.whatsapp.status.failed')} value={statusQuery.data.counts.failed} />
          <StatusCard label={t('admin.whatsapp.status.skipped')} value={statusQuery.data.counts.skipped} />
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <MessageCircle className="size-4" aria-hidden />
            {t('admin.whatsapp.attempts.title')}
          </h2>
          {statusQuery.data?.lastSentAt ? (
            <p className="text-xs text-default-500 tabular-nums">
              {t('admin.whatsapp.status.lastSentAt', { date: dateFmt.format(new Date(statusQuery.data.lastSentAt)) })}
            </p>
          ) : null}
        </div>

        {attemptsQuery.isLoading ? (
          <Table className="rounded-large border border-divider/60">
            <Table.ScrollContainer>
              <Table.Content aria-label={t('admin.whatsapp.attempts.loading')} aria-busy={true}>
                <TableSkeletonHeader cols={7} label={t('admin.whatsapp.attempts.loading')} />
                <Table.Body>
                  {Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        ) : attemptsQuery.isError ? (
          <QueryErrorState
            message={t('admin.whatsapp.attempts.errorLoad')}
            retryLabel={t('admin.query.retry')}
            onRetry={() => void attemptsQuery.refetch()}
            error={attemptsQuery.error}
          />
        ) : attemptsQuery.data?.items.length ? (
          <>
            <Table className="rounded-large border border-divider/60">
              <Table.ScrollContainer>
                <Table.Content aria-label={t('admin.whatsapp.attempts.title')} aria-busy={attemptsQuery.isFetching}>
                  <Table.Header>
                    <Table.Column isRowHeader className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.event')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.phone')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.status')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.attempts')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.failure')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.createdAt')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.key')}</Table.Column>
                  </Table.Header>
                  <Table.Body className="divide-y divide-divider/60">
                    {attemptsQuery.data.items.map((attempt) => (
                      <AttemptRow key={attempt.id} attempt={attempt} dateFmt={dateFmt} />
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
            <PaginationControls page={page} totalPages={attemptsQuery.data.totalPages} onPageChange={setPage} />
          </>
        ) : (
          <div className="content-surface p-8 text-center text-sm text-default-500">
            {t('admin.whatsapp.attempts.empty')}
          </div>
        )}
      </div>
    </section>
  );
}

function StatusCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="content-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-default-500">{label}</p>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function AttemptRow({ attempt, dateFmt }: { attempt: WhatsAppAttemptDto; dateFmt: Intl.DateTimeFormat }) {
  const { t } = useTranslation();
  return (
    <Table.Row id={attempt.id} className="bg-content1 transition-colors hover:bg-content2">
      <Table.Cell className="px-4 py-3 text-sm font-medium">{attempt.eventType}</Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm tabular-nums text-default-600">{attempt.recipientPhoneMasked}</Table.Cell>
      <Table.Cell className="px-4 py-3"><AttemptStatusChip status={attempt.status} /></Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm tabular-nums">{attempt.attempts}</Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm text-default-500">{attempt.failureReason ?? t('admin.whatsapp.attempts.none')}</Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm tabular-nums text-default-500">{dateFmt.format(new Date(attempt.createdAt))}</Table.Cell>
      <Table.Cell className="px-4 py-3 text-xs text-default-500">{attempt.idempotencyKey}</Table.Cell>
    </Table.Row>
  );
}

function ConnectionChip({ state }: { state: string }) {
  const { t } = useTranslation();
  const color = state === 'connected' ? 'success' : state === 'initializing' ? 'warning' : 'danger';
  return <Chip color={color} variant="soft">{t(`admin.whatsapp.states.${state}`, { defaultValue: state })}</Chip>;
}

function AttemptStatusChip({ status }: { status: string }) {
  const { t } = useTranslation();
  const color = status === 'sent' ? 'success' : status === 'pending' || status === 'processing' ? 'warning' : status === 'skipped' ? 'default' : 'danger';
  return <Chip color={color} variant="soft">{t(`admin.whatsapp.attemptStatus.${status}`, { defaultValue: status })}</Chip>;
}
