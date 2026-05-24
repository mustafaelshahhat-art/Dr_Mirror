import { AlertDialog, Button, Card, Form, Label, Table, TextArea, TextField, toast, useOverlayState } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { ArrowLeft, CheckCircle2, Phone, MapPin, Receipt, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useApiErrorToast } from '../../shared/hooks/useApiErrorToast';
import { queryKeys } from '../../shared/lib/query-keys';
import { ReturnStatusBadge } from '../orders/components/ReturnStatusBadge';
import { RETURN_STATUSES } from '../orders/types';
import type { AppLang } from '../../shared/lib/theme-storage';
import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { DetailFieldSkeleton, Skeleton } from '../../shared/components/Skeleton';
import { formatCurrency } from '../../shared/lib/format';
import { adminReturnsApi, type AdminReturnRequestDto } from './api';
import { useAdminReturnQuery } from './hooks';

const rejectSchema = z.object({
  adminNote: z.string().trim().min(1, 'adminNoteRequired').max(1000, 'adminNoteTooLong'),
});

type RejectFormValues = z.infer<typeof rejectSchema>;

type ReturnAction = 'Approve' | 'Reject' | 'MarkReceived' | 'Complete';

const SUBMITTING_KEY: Record<ReturnAction, string> = {
  Approve: 'approveSubmitting',
  Reject: 'rejectSubmitting',
  MarkReceived: 'receiveSubmitting',
  Complete: 'completeSubmitting',
};

export function AdminReturnDetailPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';
  const { returnId } = useParams<{ returnId: string }>();
  const query = useAdminReturnQuery(returnId);
  const queryClient = useQueryClient();
  const errorToast = useApiErrorToast();
  const [isRejecting, setIsRejecting] = useState(false);
  const completeState = useOverlayState({ defaultOpen: false });
  const [pendingAction, setPendingAction] = useState<ReturnAction | null>(null);

  const mutation = useMutation<
    AdminReturnRequestDto,
    Error,
    { action: ReturnAction; adminNote?: string | null }
  >({
    mutationFn: (input) =>
      adminReturnsApi.transitionReturn(query.data!.orderNumber, query.data!.id, input),
    onSuccess: () => {
      setIsRejecting(false);
      setPendingAction(null);
      completeState.close();
      toast.success(t('admin.returns.detail.actionSuccess'));
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.returnsList({}) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.return(returnId!) });
    },
    onError: (error) => {
      errorToast(error);
      setPendingAction(null);
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { adminNote: '' },
  });

  const dateFmt = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  });

  const isMutating = mutation.isPending || isSubmitting;

  if (query.isLoading) {
    return (
      <div className="space-y-8 animate-pulse" aria-busy="true" aria-label={t('admin.returns.detail.loading')}>
        <Skeleton className="h-4 w-32" />
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-24 rounded-medium" />
        </header>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card>
              <Card.Content className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <DetailFieldSkeleton key={i} />
                ))}
              </Card.Content>
            </Card>
          </div>
          <Card>
            <Card.Content className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <DetailFieldSkeleton key={i} valueClass="w-32" />
              ))}
            </Card.Content>
          </Card>
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    const status = (query.error as { response?: { status?: number } })?.response?.status;
    const isNotFound = status === 404;
    if (!isNotFound) {
      return (
        <QueryErrorState
          message={t('admin.returns.detail.error')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        error={query.error}
        />
      );
    }
    return (
      <div className="enter-fade-up content-surface space-y-3 p-10 text-center">
        <h1 className="text-lg font-semibold">{t('admin.returns.detail.notFoundTitle')}</h1>
        <p className="text-sm text-default-500">{t('admin.returns.detail.notFoundSubtitle')}</p>
        <Link to="/admin/returns" className={buttonVariants({ variant: 'primary' })}>
          {t('admin.returns.detail.backToList')}
        </Link>
      </div>
    );
  }

  const r = query.data;
  const errorMsg = (message?: string) => (message ? t(`returns.errors.${message}`) : null);

  const status = r.status;
  const isRequested = status === RETURN_STATUSES.Requested;
  const isApproved = status === RETURN_STATUSES.Approved;
  const isReceived = status === RETURN_STATUSES.Received;
  const isTerminal = status === RETURN_STATUSES.Completed
    || status === RETURN_STATUSES.Rejected
    || status === RETURN_STATUSES.Cancelled;

  const showActions = isRequested || isApproved || isReceived;

  return (
    <section className="space-y-8">
      <Link to="/admin/returns" className="back-link inline-flex items-center gap-2 text-sm text-default-500 hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('admin.returns.detail.backToList')}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('admin.returns.detail.title')}
          </h1>
          <p className="text-sm text-default-500">
            {t('admin.returns.detail.order')}:{' '}
            <Link
              to={`/admin/orders/${encodeURIComponent(r.orderNumber)}`}
              className="text-primary hover:underline font-semibold"
            >
              {r.orderNumber}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReturnStatusBadge status={r.status} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Buyer Details */}
          <Card>
            <Card.Header>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-default-500">
                {t('admin.returns.detail.customer')}
              </h2>
            </Card.Header>
            <Card.Content className="space-y-1">
              <p className="text-sm font-medium text-foreground">{r.buyerFullName}</p>
              {r.buyerEmail && (
                <a
                  href={`mailto:${r.buyerEmail}`}
                  className="text-sm text-primary underline-offset-2 hover:underline"
                >
                  {r.buyerEmail}
                </a>
              )}
              {r.buyerPhone && (
                <p className="flex items-center gap-2 text-sm text-default-500">
                  <Phone className="size-3.5 shrink-0" aria-hidden />
                  <span>{r.buyerPhone}</span>
                </p>
              )}
            </Card.Content>
          </Card>

          {/* Shipping Address */}
          <Card>
            <Card.Header>
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-default-500">
                <MapPin className="size-3.5" aria-hidden />
                {t('admin.returns.detail.shippingAddress')}
              </h2>
            </Card.Header>
            <Card.Content className="space-y-2">
              <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                <div>
                  <span className="block text-xs text-default-500">{t('admin.returns.detail.recipient')}</span>
                  <span className="block text-sm font-medium text-foreground">{r.shippingRecipientName}</span>
                </div>
                <div>
                  <span className="block text-xs text-default-500">{t('admin.returns.detail.buyerPhone')}</span>
                  <span className="block text-sm text-foreground">{r.shippingPhone}</span>
                </div>
                <div>
                  <span className="block text-xs text-default-500">{t('admin.returns.detail.governorate')}</span>
                  <span className="block text-sm text-foreground">{r.shippingGovernorate}</span>
                </div>
                <div>
                  <span className="block text-xs text-default-500">{t('admin.returns.detail.city')}</span>
                  <span className="block text-sm text-foreground">{r.shippingCity}</span>
                </div>
              </div>
              <div>
                <span className="block text-xs text-default-500">{t('admin.returns.detail.street')}</span>
                <span className="block text-sm text-foreground">{r.shippingStreetAddress}</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {r.shippingFloor && (
                  <div>
                    <span className="text-xs text-default-500">{t('admin.returns.detail.floor')}</span>
                    <span className="ms-1 text-sm text-foreground">{r.shippingFloor}</span>
                  </div>
                )}
                {r.shippingApartment && (
                  <div>
                    <span className="text-xs text-default-500">{t('admin.returns.detail.apartment')}</span>
                    <span className="ms-1 text-sm text-foreground">{r.shippingApartment}</span>
                  </div>
                )}
                {r.shippingLandmark && (
                  <div>
                    <span className="text-xs text-default-500">{t('admin.returns.detail.landmark')}</span>
                    <span className="ms-1 text-sm text-foreground">{r.shippingLandmark}</span>
                  </div>
                )}
              </div>
              {r.shippingNotes && (
                <div className="border-t border-divider/60 pt-2">
                  <span className="block text-xs text-default-500">{t('admin.returns.detail.shippingNotes')}</span>
                  <span className="block text-sm text-foreground">{r.shippingNotes}</span>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Return Reason */}
          <Card>
            <Card.Header>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-default-500">
                {t('admin.returns.detail.reason')}
              </h2>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-foreground whitespace-pre-wrap">{r.customerReason}</p>
            </Card.Content>
          </Card>

          {/* Admin Note if Rejected or Approved */}
          {r.adminNote && (
            <Card>
              <Card.Header>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-default-500">
                  {t('returns.form.adminNoteLabel')}
                </h2>
              </Card.Header>
              <Card.Content>
                <p className="text-sm text-foreground whitespace-pre-wrap">{r.adminNote}</p>
              </Card.Content>
            </Card>
          )}

          {/* Order Totals */}
          <Card>
            <Card.Header>
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-default-500">
                <Receipt className="size-3.5" aria-hidden />
                {t('admin.returns.detail.orderTotals')}
              </h2>
            </Card.Header>
            <Card.Content className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-default-500">{t('admin.returns.detail.subTotal')}</span>
                <span className="tabular-nums">{formatCurrency(r.orderSubTotal, lang)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-default-500">{t('admin.returns.detail.shippingFee')}</span>
                <span className="tabular-nums">{formatCurrency(r.orderShippingFee, lang)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold border-t border-divider/60 pt-2">
                <span>{t('admin.returns.detail.total')}</span>
                <span className="tabular-nums">{formatCurrency(r.orderTotal, lang)}</span>
              </div>
            </Card.Content>
          </Card>

          {/* Payment */}
          <Card>
            <Card.Header>
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-default-500">
                <CreditCard className="size-3.5" aria-hidden />
                {t('admin.returns.detail.payment')}
              </h2>
            </Card.Header>
            <Card.Content className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-default-500">{t('admin.returns.detail.paymentMethod')}</span>
                <span className="text-foreground">{isAr ? r.paymentMethodNameAr : r.paymentMethodNameEn}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-default-500">{t('admin.returns.detail.paymentStatus')}</span>
                <span className="text-foreground">{t(`admin.paymentStatus.${r.paymentStatusLabel}`)}</span>
              </div>
            </Card.Content>
          </Card>

          {/* Returned Items */}
          <Card>
            <Card.Header>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-default-500">
                {t('admin.returns.detail.items')}
              </h2>
            </Card.Header>
            <Card.Content className="p-0">
              <Table aria-label={t('admin.returns.detail.items')} className="border-none shadow-none">
                <Table.ScrollContainer>
                  <Table.Content aria-label={t('admin.returns.detail.items')}>
                    <Table.Header>
                      <Table.Column isRowHeader className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">
                        {t('admin.returns.detail.cols.product')}
                      </Table.Column>
                      <Table.Column className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-default-500">
                        {t('admin.returns.detail.cols.variant')}
                      </Table.Column>
                      <Table.Column className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-default-500">
                        {t('admin.returns.detail.cols.price')}
                      </Table.Column>
                      <Table.Column className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-default-500">
                        {t('admin.returns.detail.cols.qty')}
                      </Table.Column>
                      <Table.Column className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-default-500">
                        {t('admin.returns.detail.cols.subtotal')}
                      </Table.Column>
                    </Table.Header>
                    <Table.Body className="divide-y divide-divider/60">
                      {r.items.map((item) => (
                        <Table.Row key={item.id} className="bg-content1">
                          <Table.Cell className="px-4 py-3 font-medium">
                            {isAr ? item.nameAr : item.nameEn}
                          </Table.Cell>
                          <Table.Cell className="px-4 py-3 text-default-500">
                            {item.size} · {isAr ? item.colorNameAr : item.colorName}
                          </Table.Cell>
                          <Table.Cell className="px-4 py-3 text-end tabular-nums">
                            {formatCurrency(item.unitPrice, lang)}
                          </Table.Cell>
                          <Table.Cell className="px-4 py-3 text-center tabular-nums">
                            {item.quantity}
                          </Table.Cell>
                          <Table.Cell className="px-4 py-3 text-end tabular-nums font-semibold">
                            {formatCurrency(item.unitPrice * item.quantity, lang)}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </Card.Content>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Status Metadata */}
          <Card>
            <Card.Header>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-default-500">
                {t('admin.returns.detail.title')}
              </h2>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="space-y-1">
                <span className="block text-xs text-default-500">{t('admin.returns.detail.createdAt')}</span>
                <span className="block text-sm font-medium text-foreground tabular-nums">
                  {dateFmt.format(new Date(r.createdAt))}
                </span>
              </div>
              {r.reviewedAt && (
                <div className="space-y-1 border-t border-divider/60 pt-3">
                  <span className="block text-xs text-default-500">{t('admin.returns.detail.reviewedAt')}</span>
                  <span className="block text-sm font-medium text-foreground tabular-nums">
                    {dateFmt.format(new Date(r.reviewedAt))}
                  </span>
                  {r.reviewedByAdminName && (
                    <span className="block text-xs text-default-500">
                      {t('admin.audit.filters.actor')}: {r.reviewedByAdminName}
                    </span>
                  )}
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Action Panel */}
          {showActions && (
            <Card className="border border-primary-500/30">
              <Card.Header>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-default-500">
                  {t('admin.returns.detail.actions.heading')}
                </h2>
              </Card.Header>
              <Card.Content className="space-y-4">
                {isRequested && !isRejecting && !isMutating && (
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full"
                      isDisabled={isMutating}
                      onPress={() => {
                        setPendingAction('Approve');
                        mutation.mutate({ action: 'Approve' });
                      }}
                    >
                      {pendingAction === 'Approve' && isMutating
                        ? t('admin.returns.detail.approveSubmitting')
                        : t('admin.returns.detail.approve')}
                    </Button>
                    <Button
                      type="button"
                      variant="danger-soft"
                      className="w-full"
                      isDisabled={isMutating}
                      onPress={() => {
                        setIsRejecting(true);
                        reset();
                      }}
                    >
                      {t('admin.returns.detail.reject')}
                    </Button>
                  </div>
                )}

                {isApproved && !isMutating && (
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    isDisabled={isMutating}
                    onPress={() => {
                      setPendingAction('MarkReceived');
                      mutation.mutate({ action: 'MarkReceived' });
                    }}
                  >
                    {pendingAction === 'MarkReceived' && isMutating
                      ? t('admin.returns.detail.receiveSubmitting')
                      : t('admin.returns.detail.markReceived')}
                  </Button>
                )}

                {isReceived && !isMutating && (
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    onPress={() => completeState.open()}
                    isDisabled={isMutating}
                  >
                    {t('admin.returns.detail.completeReturn')}
                  </Button>
                )}

                {isMutating && !isRejecting && (
                  <p className="text-center text-sm text-default-500">
                    {pendingAction ? t(`admin.returns.detail.${SUBMITTING_KEY[pendingAction]}`) : t('common.submitting')}
                  </p>
                )}

                {isRequested && isRejecting && (
                  <Form
                    onSubmit={handleSubmit(async (values) => {
                      setPendingAction('Reject');
                      await mutation.mutateAsync({
                        action: 'Reject',
                        adminNote: values.adminNote.trim(),
                      });
                    })}
                    className="space-y-3"
                  >
                    <Controller
                      name="adminNote"
                      control={control}
                      render={({ field }) => (
                        <TextField isInvalid={Boolean(errors.adminNote)} className="flex flex-col gap-1">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-default-500">
                            {t('returns.form.adminNoteLabel')}
                          </Label>
                          <TextArea
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            rows={3}
                            maxLength={1000}
                            fullWidth
                            placeholder={t('admin.returns.detail.rejectNotePlaceholder')}
                            className="text-sm text-start border border-default-400 dark:border-default-300"
                          />
                          {errors.adminNote?.message && (
                            <p role="alert" className="text-xs text-danger">
                              {errorMsg(errors.adminNote.message)}
                            </p>
                          )}
                        </TextField>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        isDisabled={isMutating}
                      >
                        {pendingAction === 'Reject' && isMutating
                          ? t('admin.returns.detail.rejectSubmitting')
                          : t('admin.returns.detail.reject')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onPress={() => setIsRejecting(false)}
                        isDisabled={isMutating}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </Form>
                )}
              </Card.Content>
            </Card>
          )}

          {isTerminal && (
            <Card className="border border-default-200">
              <Card.Content className="flex items-center gap-2 py-3">
                <CheckCircle2 className="size-4 text-default-400" aria-hidden />
                <p className="text-sm text-default-500">
                  {t('admin.transition.terminalState')}
                </p>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>

      {/* Complete Confirmation AlertDialog */}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={completeState.isOpen}
          isDismissable={!isMutating}
          onOpenChange={(open) => {
            completeState.setOpen(open);
            if (!open && !isMutating) {
              setPendingAction(null);
            }
          }}
        >
          <AlertDialog.Container size="xs">
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>
                      {t('admin.returns.detail.completeConfirmTitle')}
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-default-500">
                      {t('admin.returns.detail.completeConfirmBody')}
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isDisabled={isMutating}
                      onPress={close}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isDisabled={isMutating}
                      onPress={() => {
                        setPendingAction('Complete');
                        mutation.mutate({ action: 'Complete' });
                      }}
                    >
                      {pendingAction === 'Complete' && isMutating
                        ? t('admin.returns.detail.completeSubmitting')
                        : t('admin.returns.detail.completeReturn')}
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
