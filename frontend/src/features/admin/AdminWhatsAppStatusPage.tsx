import { AlertDialog, Button, Chip, Spinner, Table, toast, useOverlayState } from '@heroui/react';
import { LogOut, MessageCircle, QrCode, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '../../shared/components/PageHeader';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { TableRowSkeleton, TableSkeletonHeader } from '../../shared/components/TableRowSkeleton';
import { queryKeys } from '../../shared/lib/query-keys';
import { adminWhatsAppApi } from './api';
import { useDisconnectMutation, useRetryAllFailedMutation, useRetryAttemptMutation } from './hooks';
import type { WhatsAppAttemptDto } from './types';
import { getWhatsAppEventLabel } from './whatsapp-event-labels';

const PAGE_SIZE = 20;

export function AdminWhatsAppStatusPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const disconnectState = useOverlayState({ defaultOpen: false });
  const retryAllConfirmState = useOverlayState({ defaultOpen: false });
  const disconnectMutation = useDisconnectMutation();
  const retryMutation = useRetryAttemptMutation();
  const retryAllMutation = useRetryAllFailedMutation();
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

  const targetMap = useMemo(() => {
    const map = new Map<string, string | null>();
    if (attemptsQuery.data) {
      for (const a of attemptsQuery.data.items) {
        map.set(a.id, resolveAttemptTarget(a));
      }
    }
    return map;
  }, [attemptsQuery.data]);

  function handleRowAction(key: React.Key) {
    const id = String(key);
    const target = targetMap.get(id);
    if (target) {
      navigate(target);
    } else {
      toast.danger(t('admin.whatsapp.attempts.noTarget'));
    }
  }

  return (
    <section className="space-y-8">
      <PageHeader
        title={t('admin.whatsapp.status.title')}
        subtitle={t('admin.whatsapp.status.subtitle')}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            {statusQuery.data?.qrRequired ? (
              <Button variant="primary" onPress={() => navigate('/admin/whatsapp/pair')}>
                <QrCode className="size-4" aria-hidden />
                {t('admin.whatsapp.status.pairDevice')}
              </Button>
            ) : null}
            {statusQuery.data?.connectionState === 'connected' || statusQuery.data?.connectionState === 'auth_failed' ? (
              <Button variant="danger" onPress={disconnectState.open}>
                <LogOut className="size-4" aria-hidden />
                {t('admin.whatsapp.disconnect.button')}
              </Button>
            ) : null}
          </div>
        )}
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
        <div className="grid gap-3 sm:grid-cols-5">
          <StatusCard
            label={t('admin.whatsapp.status.connection')}
            value={<ConnectionChip state={statusQuery.data.connectionState} />}
          />
          <StatusCard label={t('admin.whatsapp.status.sent')} value={statusQuery.data.counts.sent} />
          <StatusCard label={t('admin.whatsapp.status.failed')} value={statusQuery.data.counts.failed} />
          <StatusCard label={t('admin.whatsapp.status.skipped')} value={statusQuery.data.counts.skipped} />
          <StatusCard label={t('admin.whatsapp.status.retrying')} value={statusQuery.data.counts.retrying} />
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <MessageCircle className="size-4" aria-hidden />
            {t('admin.whatsapp.attempts.title')}
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {statusQuery.data?.lastSentAt ? (
              <p className="text-xs text-default-500 tabular-nums">
                {t('admin.whatsapp.status.lastSentAt', { date: dateFmt.format(new Date(statusQuery.data.lastSentAt)) })}
              </p>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              isDisabled={!statusQuery.data?.counts.failed || retryAllMutation.isPending}
              onPress={retryAllConfirmState.open}
            >
              <RefreshCw className={retryAllMutation.isPending ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
              {retryAllMutation.isPending ? t('admin.whatsapp.retryAll.submitting') : t('admin.whatsapp.retryAll.button')}
            </Button>
          </div>
        </div>

        {attemptsQuery.isLoading ? (
          <Table className="rounded-large border border-divider/60">
            <Table.ScrollContainer>
              <Table.Content aria-label={t('admin.whatsapp.attempts.loading')} aria-busy={true}>
                  <TableSkeletonHeader cols={8} label={t('admin.whatsapp.attempts.loading')} />
                  <Table.Body>
                    {Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)}
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
                <Table.Content aria-label={t('admin.whatsapp.attempts.title')} aria-busy={attemptsQuery.isFetching} onRowAction={handleRowAction}>
                  <Table.Header>
                    <Table.Column isRowHeader className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.event')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.phone')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.status')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.attempts')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.failure')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.createdAt')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.key')}</Table.Column>
                    <Table.Column className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-default-500">{t('admin.whatsapp.attempts.actions')}</Table.Column>
                  </Table.Header>
                  <Table.Body className="divide-y divide-divider/60">
                    {attemptsQuery.data.items.map((attempt) => (
                      <AttemptRow
                        key={attempt.id}
                        attempt={attempt}
                        dateFmt={dateFmt}
                        onRetry={(id) => retryMutation.mutate(id)}
                        isRetrying={retryMutation.isPending && retryMutation.variables === attempt.id}
                      />
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

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={disconnectState.isOpen}
          isDismissable={!disconnectMutation.isPending}
          onOpenChange={disconnectState.setOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>{t('admin.whatsapp.disconnect.title')}</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-default-500">{t('admin.whatsapp.disconnect.body')}</p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button type="button" variant="ghost" size="sm" isDisabled={disconnectMutation.isPending} onPress={close}>
                      {t('admin.whatsapp.disconnect.cancel')}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      isDisabled={disconnectMutation.isPending}
                      onPress={() => disconnectMutation.mutate(undefined, { onSuccess: close })}
                    >
                      {disconnectMutation.isPending ? t('admin.whatsapp.disconnect.submitting') : t('admin.whatsapp.disconnect.confirm')}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={retryAllConfirmState.isOpen}
          isDismissable={!retryAllMutation.isPending}
          onOpenChange={retryAllConfirmState.setOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>{t('admin.whatsapp.retryAll.confirm.title')}</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-default-500">
                      {t('admin.whatsapp.retryAll.confirm.body', { count: statusQuery.data?.counts.failed ?? 0 })}
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button type="button" variant="ghost" size="sm" isDisabled={retryAllMutation.isPending} onPress={close}>
                      {t('admin.whatsapp.retryAll.confirm.cancel')}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isDisabled={retryAllMutation.isPending}
                      onPress={() => retryAllMutation.mutate(undefined, { onSuccess: close })}
                    >
                      {retryAllMutation.isPending ? t('admin.whatsapp.retryAll.submitting') : t('admin.whatsapp.retryAll.confirm.confirm')}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
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

function resolveAttemptTarget(attempt: WhatsAppAttemptDto): string | null {
  if (attempt.entityType === 'Order' && attempt.entityReference) {
    return `/admin/orders/${attempt.entityReference}`;
  }
  if (attempt.entityType === 'Return' && attempt.entityId) {
    return `/admin/returns/${attempt.entityId}`;
  }
  if (attempt.entityReference && attempt.idempotencyKey.startsWith('order:')) {
    return `/admin/orders/${attempt.entityReference}`;
  }
  const keyParts = attempt.idempotencyKey.split(':');
  if (keyParts[0] === 'return' && keyParts[1]) {
    return `/admin/returns/${keyParts[1]}`;
  }
  return null;
}

function AttemptRow({
  attempt,
  dateFmt,
  onRetry,
  isRetrying,
}: {
  attempt: WhatsAppAttemptDto;
  dateFmt: Intl.DateTimeFormat;
  onRetry: (id: string) => void;
  isRetrying: boolean;
}) {
  const { t } = useTranslation();
  const target = resolveAttemptTarget(attempt);
  const eventLabel = getWhatsAppEventLabel(attempt.eventType, attempt.idempotencyKey);

  return (
    <Table.Row
      id={attempt.id}
      className={target
        ? 'cursor-pointer bg-content1 transition-colors hover:bg-default-100'
        : 'bg-content1 transition-colors'}
    >
      <Table.Cell className="px-4 py-3 text-sm font-medium">
        <span className="block leading-tight">{eventLabel.label}</span>
        {eventLabel.sublabel ? (
          <span className="block text-xs text-default-400">{eventLabel.sublabel}</span>
        ) : null}
      </Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm tabular-nums text-default-600">{attempt.recipientPhoneMasked}</Table.Cell>
      <Table.Cell className="px-4 py-3"><AttemptStatusChip status={attempt.status} /></Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm tabular-nums">{attempt.attempts}</Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm text-default-500">{attempt.failureReason ?? t('admin.whatsapp.attempts.none')}</Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm tabular-nums text-default-500">{dateFmt.format(new Date(attempt.createdAt))}</Table.Cell>
      <Table.Cell className="max-w-[160px] px-4 py-3 text-xs text-default-500"><div className="truncate" title={attempt.idempotencyKey}>{attempt.idempotencyKey}</div></Table.Cell>
      <Table.Cell className="px-4 py-3 text-end">
        {attempt.status === 'failed' ? (
          <Button
            size="sm"
            variant="secondary"
            isDisabled={isRetrying}
            aria-label={t('admin.whatsapp.retry.button')}
            onPress={() => onRetry(attempt.id)}
          >
            <RefreshCw className={isRetrying ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
            <span className="hidden sm:inline">{t('admin.whatsapp.retry.button')}</span>
          </Button>
        ) : null}
      </Table.Cell>
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
  const color = status === 'sent' ? 'success' : status === 'pending' || status === 'processing' || status === 'retrying' ? 'warning' : status === 'skipped' ? 'default' : 'danger';
  return (
    <Chip color={color} variant="soft">
      {status === 'retrying' ? <RefreshCw className="me-1 inline size-3 animate-spin" aria-hidden /> : null}
      {t(`admin.whatsapp.attemptStatus.${status}`, { defaultValue: status })}
    </Chip>
  );
}
