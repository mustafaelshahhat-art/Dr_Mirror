/* eslint-disable i18next/no-literal-string -- Allow filter values and styling constants */
import { AlertDialog, Button, Chip, Input, Spinner, Table, toast, useOverlayState } from '@heroui/react';
import { CheckCircle2, Clock, Info, LogOut, MessageCircle, QrCode, RefreshCw, Search, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';

import { PageHeader } from '../../shared/components/PageHeader';
import { PaginationControls } from '../../shared/components/PaginationControls';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { TableRowSkeleton, TableSkeletonHeader } from '../../shared/components/TableRowSkeleton';
import { queryKeys } from '../../shared/lib/query-keys';
import { adminWhatsAppApi } from './api';
import { useDisconnectMutation, useRetryAllFailedMutation, useRetryAttemptMutation } from './hooks';
import type { WhatsAppAttemptDto } from './types';
import { getWhatsAppEventLabel } from './whatsapp-event-labels';
import { SelectField } from '../../shared/components/SelectField';
import { EmptyState } from '../../shared/components/EmptyState';

const PAGE_SIZE = 20;

export function AdminWhatsAppStatusPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
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

  const filteredAttempts = useMemo(() => {
    if (!attemptsQuery.data?.items) return [];
    return attemptsQuery.data.items.filter((attempt) => {
      const labelData = getWhatsAppEventLabel(attempt.eventType, attempt.idempotencyKey);
      const matchesSearch =
        !search ||
        attempt.recipientPhoneMasked.toLowerCase().includes(search.toLowerCase()) ||
        attempt.eventType.toLowerCase().includes(search.toLowerCase()) ||
        (attempt.failureReason && attempt.failureReason.toLowerCase().includes(search.toLowerCase())) ||
        labelData.label.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || attempt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [attemptsQuery.data, search, statusFilter]);

  function handleRowAction(key: React.Key) {
    const id = String(key);
    const target = targetMap.get(id);
    if (target) {
      navigate(target);
    } else {
      toast.danger(t('admin.whatsapp.attempts.noTarget'));
    }
  }

  const connectionStateVal = statusQuery.data?.connectionState ?? 'disconnected';

  return (
    <section className="space-y-8 animate-fade-in">
      <PageHeader
        title={t('admin.whatsapp.status.title')}
        subtitle={t('admin.whatsapp.status.subtitle')}
      />

      {statusQuery.isLoading ? (
        <div className="content-surface flex items-center gap-3 p-6 rounded-2xl text-sm text-default-500 border border-divider/60">
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
        <div className="space-y-6">
          {/* Stunning Connection Status Overview Banner */}
          <div className="content-surface p-5 border border-divider/60 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                connectionStateVal === 'connected'
                  ? 'bg-success/15 text-success border border-success/20'
                  : connectionStateVal === 'qr_required'
                  ? 'bg-warning/15 text-warning border border-warning/20'
                  : connectionStateVal === 'initializing'
                  ? 'bg-brand/15 text-brand border border-brand/20 animate-pulse'
                  : 'bg-danger/15 text-danger border border-danger/20'
              }`}>
                {connectionStateVal === 'connected' ? (
                  <CheckCircle2 className="size-6" />
                ) : connectionStateVal === 'qr_required' ? (
                  <QrCode className="size-6 animate-pulse" />
                ) : connectionStateVal === 'initializing' ? (
                  <Clock className="size-6" />
                ) : (
                  <XCircle className="size-6" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-foreground">
                    {t('admin.whatsapp.status.connection')}
                  </h3>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                    connectionStateVal === 'connected'
                      ? 'bg-success/15 border-success/30 text-success'
                      : connectionStateVal === 'qr_required'
                      ? 'bg-warning/15 border-warning/30 text-warning animate-pulse'
                      : connectionStateVal === 'initializing'
                      ? 'bg-brand/15 border-brand/30 text-brand'
                      : 'bg-danger/15 border-danger/30 text-danger'
                  }`}>
                    {connectionStateVal === 'initializing' && <RefreshCw className="size-3 animate-spin me-0.5" />}
                    {t(`admin.whatsapp.states.${connectionStateVal}`, { defaultValue: connectionStateVal })}
                  </span>
                </div>
                <p className="text-sm text-default-500 max-w-xl leading-relaxed">
                  {connectionStateVal === 'connected'
                    ? t('admin.whatsapp.qr.connectedToast')
                    : connectionStateVal === 'qr_required'
                    ? t('admin.whatsapp.qr.instructions')
                    : connectionStateVal === 'initializing'
                    ? t('admin.whatsapp.status.loading')
                    : t('admin.whatsapp.disconnect.body')}
                </p>
                {statusQuery.data.sidecarHealth && (
                  <p className="text-xs text-default-400 mt-1 flex items-center gap-1">
                    <span className={`inline-block size-2 rounded-full ${
                      statusQuery.data.sidecarHealth.isHealthy ? 'bg-success' : 'bg-danger'
                    }`} />
                    Sidecar: {statusQuery.data.sidecarHealth.isHealthy ? 'Healthy' : statusQuery.data.sidecarHealth.errorMessage || 'Error'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end">
              {statusQuery.data.qrRequired || connectionStateVal === 'qr_required' || connectionStateVal === 'disconnected' ? (
                <Button
                  variant="primary"
                  onPress={() => navigate('/admin/whatsapp/pair')}
                  className="w-full md:w-auto font-semibold"
                >
                  <QrCode className="size-4" aria-hidden />
                  {t('admin.whatsapp.status.pairDevice')}
                </Button>
              ) : null}
              {connectionStateVal === 'connected' || connectionStateVal === 'auth_failed' ? (
                <Button
                  variant="danger"
                  onPress={disconnectState.open}
                  className="w-full md:w-auto font-semibold"
                >
                  <LogOut className="size-4" aria-hidden />
                  {t('admin.whatsapp.disconnect.button')}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onPress={() => void statusQuery.refetch()}
                className="w-full md:w-auto font-semibold"
              >
                <RefreshCw className={statusQuery.isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
                {t('admin.whatsapp.status.refresh')}
              </Button>
            </div>
          </div>

          {/* Premium 4-Column Activity Stats Grid */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatsCard
              label={t('admin.whatsapp.status.sent')}
              value={statusQuery.data.counts.sent}
              colorClass="text-success border-success/20 bg-success/5 dark:bg-success/10"
              icon={CheckCircle2}
            />
            <StatsCard
              label={t('admin.whatsapp.status.failed')}
              value={statusQuery.data.counts.failed}
              colorClass="text-danger border-danger/20 bg-danger/5 dark:bg-danger/10"
              icon={XCircle}
            />
            <StatsCard
              label={t('admin.whatsapp.status.skipped')}
              value={statusQuery.data.counts.skipped}
              colorClass="text-default-500 border-default-200/50 bg-default-100/10 dark:bg-default-50/5"
              icon={Info}
            />
            <StatsCard
              label={t('admin.whatsapp.status.retrying')}
              value={statusQuery.data.counts.retrying}
              colorClass="text-warning border-warning/20 bg-warning/5 dark:bg-warning/10"
              icon={RefreshCw}
              animate={statusQuery.data.counts.retrying > 0}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {/* Logs Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-divider/40">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <MessageCircle className="size-5 text-brand" aria-hidden />
            {t('admin.whatsapp.attempts.title')}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {statusQuery.data?.lastSentAt ? (
              <p className="text-xs text-default-400 tabular-nums">
                {t('admin.whatsapp.status.lastSentAt', { date: dateFmt.format(new Date(statusQuery.data.lastSentAt)) })}
              </p>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              isDisabled={!statusQuery.data?.counts.failed || retryAllMutation.isPending}
              onPress={retryAllConfirmState.open}
              className="h-9 px-4 rounded-lg font-semibold text-xs transition-all hover:bg-default-200"
            >
              <RefreshCw className={retryAllMutation.isPending ? 'size-3.5 animate-spin' : 'size-3.5'} aria-hidden />
              {retryAllMutation.isPending ? t('admin.whatsapp.retryAll.submitting') : t('admin.whatsapp.retryAll.button')}
            </Button>
          </div>
        </div>

        {/* Elegant Search & Status Filters Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center w-full bg-default-50/50 dark:bg-default-100/5 p-3 rounded-2xl border border-divider/30">
          <div className="relative flex-1 flex items-center group">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-default-400 group-hover:text-brand/70 group-focus-within:text-brand transition-colors duration-300 shrink-0"
            />
            <Input
              type="search"
              aria-label={t('admin.whatsapp.attempts.searchPlaceholder')}
              placeholder={t('admin.whatsapp.attempts.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
              className="w-full h-10 ps-10 pe-10 rounded-full border border-default-200/60 bg-default-100/30 dark:bg-default-50/10 text-sm text-default-700 dark:text-default-300 placeholder:text-default-500 font-semibold transition-all duration-300 hover:border-brand/40 hover:bg-brand/5 dark:hover:bg-brand/10 focus:border-brand/80 focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-default-400 hover:text-default-600 focus:outline-none cursor-pointer"
                aria-label="Clear search"
              >
                <XCircle className="size-4" />
              </button>
            )}
          </div>
          <div className="w-full md:w-52">
            <SelectField
              label={t('admin.whatsapp.attempts.filterPlaceholder')}
              value={statusFilter}
              onChange={setStatusFilter}
              isFilter
              hideLabel
              placeholder={t('admin.whatsapp.attempts.filterAll')}
              options={[
                { value: 'sent', label: t('admin.whatsapp.attemptStatus.sent') },
                { value: 'failed', label: t('admin.whatsapp.attemptStatus.failed') },
                { value: 'skipped', label: t('admin.whatsapp.attemptStatus.skipped') },
                { value: 'retrying', label: t('admin.whatsapp.attemptStatus.retrying') },
                { value: 'pending', label: t('admin.whatsapp.attemptStatus.pending') },
                { value: 'processing', label: t('admin.whatsapp.attemptStatus.processing') },
              ]}
              className="w-full"
            />
          </div>
        </div>

        {/* Dynamic Logs Content */}
        {attemptsQuery.isLoading ? (
          <Table className="rounded-2xl border border-divider/60 overflow-hidden shadow-sm">
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
        ) : filteredAttempts.length ? (
          <>
            {/* Desktop Table View (lg screens and above) */}
            <div className="hidden lg:block overflow-hidden rounded-2xl border border-divider/60 bg-content1 shadow-sm">
              <Table.ScrollContainer>
                <Table.Content
                  aria-label={t('admin.whatsapp.attempts.title')}
                  aria-busy={attemptsQuery.isFetching}
                  onRowAction={handleRowAction}
                >
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
                    {filteredAttempts.map((attempt) => (
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
            </div>

            {/* Mobile/Tablet Stacked Cards View (hidden on lg screens) */}
            <div className="lg:hidden space-y-4" role="list">
              {filteredAttempts.map((attempt) => {
                const target = resolveAttemptTarget(attempt);
                const eventLabel = getWhatsAppEventLabel(attempt.eventType, attempt.idempotencyKey);
                const isRetrying = retryMutation.isPending && retryMutation.variables === attempt.id;

                return (
                  <div
                    key={attempt.id}
                    role="listitem"
                    className="content-surface p-4 border border-divider/60 rounded-2xl space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{eventLabel.label}</p>
                        {eventLabel.sublabel && (
                          <p className="text-xs text-default-400 truncate">{eventLabel.sublabel}</p>
                        )}
                      </div>
                      <AttemptStatusChip status={attempt.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-default-500 py-1">
                      <div>
                        <p className="text-default-400 font-semibold">{t('admin.whatsapp.attempts.phone')}</p>
                        <p className="font-medium text-default-700 dark:text-default-300 mt-0.5 tabular-nums">
                          {attempt.recipientPhoneMasked}
                        </p>
                      </div>
                      <div>
                        <p className="text-default-400 font-semibold">{t('admin.whatsapp.attempts.createdAt')}</p>
                        <p className="font-medium text-default-700 dark:text-default-300 mt-0.5 tabular-nums">
                          {dateFmt.format(new Date(attempt.createdAt))}
                        </p>
                      </div>
                      <div className="col-span-2 mt-1">
                        <p className="text-default-400 font-semibold">{t('admin.whatsapp.attempts.key')}</p>
                        <p className="font-mono text-[10px] text-default-600 truncate mt-0.5" title={attempt.idempotencyKey}>
                          {attempt.idempotencyKey}
                        </p>
                      </div>
                    </div>

                    {attempt.failureReason && (
                      <div className="p-2.5 rounded-xl bg-danger/5 border border-danger/10 text-xs text-danger leading-relaxed">
                        <span className="font-semibold">{t('admin.whatsapp.attempts.failure')}:</span> {attempt.failureReason}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-divider/30">
                      <span className="text-xs text-default-400">
                        {t('admin.whatsapp.attempts.attempts')}: <span className="font-semibold text-default-700 dark:text-default-300 tabular-nums">{attempt.attempts}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {target ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={() => navigate(target)}
                            className="h-8 px-3 rounded-lg text-xs font-semibold transition-all hover:bg-brand/10 hover:text-brand"
                          >
                            {attempt.entityType === 'Return'
                              ? t('admin.whatsapp.attempts.openReturn')
                              : t('admin.whatsapp.attempts.openOrder')}
                          </Button>
                        ) : null}
                        {attempt.status === 'failed' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            isDisabled={isRetrying}
                            onPress={() => retryMutation.mutate(attempt.id)}
                            className="h-8 min-w-[70px] rounded-lg text-xs"
                          >
                            <RefreshCw className={isRetrying ? 'size-3.5 animate-spin' : 'size-3.5'} aria-hidden />
                            {t('admin.whatsapp.retry.button')}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <PaginationControls page={page} totalPages={attemptsQuery.data?.totalPages ?? 1} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            icon={MessageCircle}
            title={search || statusFilter ? t('admin.whatsapp.attempts.noResults') : t('admin.whatsapp.attempts.empty')}
            subtitle={search || statusFilter ? undefined : t('admin.whatsapp.attempts.emptySubtitle', { defaultValue: 'All your WhatsApp notification logs and attempts will appear here.' })}
          />
        )}
      </div>

      {/* Disconnect Warning Dialog */}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={disconnectState.isOpen}
          isDismissable={!disconnectMutation.isPending}
          onOpenChange={disconnectState.setOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog className="border border-divider bg-background/95 backdrop-blur-md shadow-xl rounded-2xl">
              {({ close }) => (
                <>
                  <AlertDialog.Header className="pt-6 px-6">
                    <AlertDialog.Heading className="text-lg font-bold text-foreground">{t('admin.whatsapp.disconnect.title')}</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body className="px-6 py-4">
                    <p className="text-sm text-default-500 leading-relaxed">{t('admin.whatsapp.disconnect.body')}</p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer className="pb-6 px-6 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" isDisabled={disconnectMutation.isPending} onPress={close} className="rounded-lg">
                      {t('admin.whatsapp.disconnect.cancel')}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      isDisabled={disconnectMutation.isPending}
                      onPress={() => disconnectMutation.mutate(undefined, { onSuccess: close })}
                      className="rounded-lg"
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

      {/* Retry All Warning Dialog */}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={retryAllConfirmState.isOpen}
          isDismissable={!retryAllMutation.isPending}
          onOpenChange={retryAllConfirmState.setOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog className="border border-divider bg-background/95 backdrop-blur-md shadow-xl rounded-2xl">
              {({ close }) => (
                <>
                  <AlertDialog.Header className="pt-6 px-6">
                    <AlertDialog.Heading className="text-lg font-bold text-foreground">{t('admin.whatsapp.retryAll.confirm.title')}</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body className="px-6 py-4">
                    <p className="text-sm text-default-500 leading-relaxed">
                      {t('admin.whatsapp.retryAll.confirm.body', { count: statusQuery.data?.counts.failed ?? 0 })}
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer className="pb-6 px-6 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" isDisabled={retryAllMutation.isPending} onPress={close} className="rounded-lg">
                      {t('admin.whatsapp.retryAll.confirm.cancel')}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isDisabled={retryAllMutation.isPending}
                      onPress={() => retryAllMutation.mutate(undefined, { onSuccess: close })}
                      className="rounded-lg"
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

function StatsCard({
  label,
  value,
  colorClass,
  icon: Icon,
  animate,
}: {
  label: string;
  value: number;
  colorClass: string;
  icon: LucideIcon;
  animate?: boolean;
}) {
  return (
    <div className={`content-surface flex items-center justify-between p-4 border rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${colorClass}`}>
      <div className="space-y-1.5 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-default-500 truncate">{label}</p>
        <p className="text-3xl font-extrabold tabular-nums text-foreground">{value}</p>
      </div>
      <div className="p-3 rounded-xl bg-background/50 dark:bg-background/25 shrink-0">
        <Icon className={`size-6 ${animate ? 'animate-spin' : ''}`} aria-hidden />
      </div>
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
      <Table.Cell className="px-4 py-3 text-sm font-semibold">
        <span className="block leading-tight text-foreground">{eventLabel.label}</span>
        {eventLabel.sublabel ? (
          <span className="block text-xs font-normal text-default-400 mt-0.5">{eventLabel.sublabel}</span>
        ) : null}
      </Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm tabular-nums text-default-600 font-medium">{attempt.recipientPhoneMasked}</Table.Cell>
      <Table.Cell className="px-4 py-3"><AttemptStatusChip status={attempt.status} /></Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm tabular-nums font-semibold">{attempt.attempts}</Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm text-default-500 font-medium max-w-[200px]">
        <div className="truncate" title={attempt.failureReason ?? ''}>
          {attempt.failureReason ?? t('admin.whatsapp.attempts.none')}
        </div>
      </Table.Cell>
      <Table.Cell className="px-4 py-3 text-sm tabular-nums text-default-500 font-medium">{dateFmt.format(new Date(attempt.createdAt))}</Table.Cell>
      <Table.Cell className="max-w-[160px] px-4 py-3 text-xs text-default-500">
        <div className="truncate font-mono" title={attempt.idempotencyKey}>{attempt.idempotencyKey}</div>
      </Table.Cell>
      <Table.Cell className="px-4 py-3 text-end">
        {attempt.status === 'failed' ? (
          <Button
            size="sm"
            variant="secondary"
            isDisabled={isRetrying}
            aria-label={t('admin.whatsapp.retry.button')}
            onPress={() => onRetry(attempt.id)}
            className="h-8 rounded-lg text-xs"
          >
            <RefreshCw className={isRetrying ? 'size-3.5 animate-spin' : 'size-3.5'} aria-hidden />
            <span className="hidden sm:inline font-semibold">{t('admin.whatsapp.retry.button')}</span>
          </Button>
        ) : null}
      </Table.Cell>
    </Table.Row>
  );
}

function AttemptStatusChip({ status }: { status: string }) {
  const { t } = useTranslation();
  const color = status === 'sent' ? 'success' : status === 'pending' || status === 'processing' || status === 'retrying' ? 'warning' : status === 'skipped' ? 'default' : 'danger';
  return (
    <Chip color={color} variant="soft" size="sm">
      {status === 'retrying' ? <RefreshCw className="me-1 inline size-3 animate-spin" aria-hidden /> : null}
      {t(`admin.whatsapp.attemptStatus.${status}`, { defaultValue: status })}
    </Chip>
  );
}
