import { AlertDialog, Button, FieldError, Heading, Label, TextArea, TextField, Toolbar, useOverlayState } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { orderStatusTranslationKey } from '../../orders/components/orderStatusTranslationKey';
import { paymentMethodGroup } from '../../orders/lib/paymentMethodGroup';
import { ORDER_STATUSES, type OrderDetailDto, type OrderStatus } from '../../orders/types';
import { useAdminTransitionMutation } from '../hooks';

import { adminTransitionActionKey } from './adminTransitionActionKey';

interface AdminTransitionActionsProps {
  order: OrderDetailDto;
}

/**
 * Renders one button per <c>order.allowedNextStatesForAdmin</c> entry. Clicking
 * opens a small confirmation panel below the buttons; Cancelled requires a
 * reason (mirrors the backend's <c>RejectPaymentProofRequest</c> / cancel
 * reason convention). The mutation hook handles cache invalidation.
 */
export function AdminTransitionActions({ order }: AdminTransitionActionsProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const transition = useAdminTransitionMutation({ orderNumber: order.orderNumber });
  const cancelState = useOverlayState({ defaultOpen: false });
  const visibleNextStates = visibleAdminNextStates(order);

  if (visibleNextStates.length === 0) {
    return (
      <p className="text-xs text-default-500">
        {t('admin.transition.terminalState')}
      </p>
    );
  }

  const isCancelling = target === ORDER_STATUSES.Cancelled;

  function resetLocalState() {
    setTarget(null);
    setReason('');
    setError(null);
    if (cancelState.isOpen) cancelState.close();
  }

  async function submit() {
    if (target === null) return;
    if (isCancelling && reason.trim().length === 0) {
      setError(t('admin.transition.reasonRequired'));
      return;
    }
    setError(null);
    try {
      await transition.mutateAsync({
        toStatus: target,
        reason: reason.trim() || null,
      });
      resetLocalState();
    } catch {
      resetLocalState();
    }
  }

  return (
    <section
      aria-labelledby="transition-heading"
      className="content-surface space-y-3 p-4"
    >
      <Heading level={2} id="transition-heading" className="text-sm font-semibold text-foreground">
        {t('admin.transition.heading')}
      </Heading>

      <Toolbar aria-label={t('admin.transition.heading')} className="flex flex-wrap gap-2">
        {visibleNextStates.map((status) => {
          const isCancel = status === ORDER_STATUSES.Cancelled;
          const isActive = status === target;
          const actionKey = adminTransitionActionKey(order.status, status);
          return (
            <Button
              key={status}
              type="button"
              variant={isCancel ? 'danger-soft' : isActive ? 'primary' : 'outline'}
              size="sm"
              isDisabled={transition.isPending}
              onPress={() => {
                setError(null);
                if (isCancel && !isActive) {
                  setTarget(status);
                  setReason('');
                  cancelState.open();
                  return;
                }
                setTarget(isActive ? null : status);
                if (!isActive) setReason('');
              }}
            >
              {t(actionKey)}
            </Button>
          );
        })}
      </Toolbar>

      {target !== null && !isCancelling ? (
        <div className="space-y-2 rounded-medium border border-divider/60 bg-content2 p-3">
          <p className="text-sm font-medium">
            {t('admin.transition.confirmHeading', {
              status: t(orderStatusTranslationKey(target)),
            })}
          </p>
          <TextField isInvalid={Boolean(error)} className="flex flex-col gap-1">
            <Label className="sr-only">
              {isCancelling
                ? t('admin.transition.reasonPlaceholderRequired')
                : t('admin.transition.reasonPlaceholderOptional')}
            </Label>
            <TextArea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              fullWidth
              placeholder={
                isCancelling
                  ? t('admin.transition.reasonPlaceholderRequired')
                  : t('admin.transition.reasonPlaceholderOptional')
              }
              className="text-sm text-start border border-default-400 dark:border-default-300"
            />
            {error ? <FieldError className="text-xs text-danger">{error}</FieldError> : null}
          </TextField>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isCancelling ? 'danger' : 'primary'}
              size="sm"
              isDisabled={transition.isPending}
              onPress={() => void submit()}
            >
              {transition.isPending
                ? t('admin.transition.submitting')
                : t('admin.transition.confirm')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isDisabled={transition.isPending}
              onPress={() => {
                setTarget(null);
                setReason('');
                setError(null);
              }}
            >
              {t('admin.transition.dismiss')}
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={cancelState.isOpen}
          isDismissable={false}
          onOpenChange={(open) => {
            cancelState.setOpen(open);
            if (!open && !transition.isPending) {
              setTarget(null);
              setReason('');
              setError(null);
            }
          }}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>
                      {t('admin.transition.confirmHeading', {
                        status: t(orderStatusTranslationKey(ORDER_STATUSES.Cancelled)),
                      })}
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <TextField isInvalid={Boolean(error)} className="flex flex-col gap-1">
                      <Label className="sr-only">{t('admin.transition.reasonPlaceholderRequired')}</Label>
                      <TextArea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        maxLength={500}
                        fullWidth
                        placeholder={t('admin.transition.reasonPlaceholderRequired')}
                        className="text-sm text-start border border-default-400 dark:border-default-300"
                      />
                      {error ? <FieldError className="text-xs text-danger">{error}</FieldError> : null}
                    </TextField>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isDisabled={transition.isPending}
                      onPress={close}
                    >
                      {t('admin.transition.dismiss')}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      isDisabled={transition.isPending}
                      onPress={() => void submit()}
                    >
                      {transition.isPending
                        ? t('admin.transition.submitting')
                        : t('admin.transition.confirm')}
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

function visibleAdminNextStates(order: OrderDetailDto): OrderStatus[] {
  const group = paymentMethodGroup(order.paymentMethodKind);

  if (group === 'proof' && order.status === ORDER_STATUSES.PendingPaymentReview) {
    return order.allowedNextStatesForAdmin.filter((status) =>
      status === ORDER_STATUSES.Paid || status === ORDER_STATUSES.Pending,
    );
  }

  if (group === 'proof' && order.status === ORDER_STATUSES.Pending) {
    return order.allowedNextStatesForAdmin.filter((status) => !isFulfillmentStatus(status));
  }

  if (order.status === ORDER_STATUSES.Paid) {
    return order.allowedNextStatesForAdmin.filter((status) => status === ORDER_STATUSES.Preparing);
  }

  if (order.status === ORDER_STATUSES.Preparing) {
    return order.allowedNextStatesForAdmin.filter((status) => status === ORDER_STATUSES.Shipped);
  }

  return order.allowedNextStatesForAdmin;
}

function isFulfillmentStatus(status: OrderStatus): boolean {
  return status === ORDER_STATUSES.Preparing
    || status === ORDER_STATUSES.Shipped
    || status === ORDER_STATUSES.Delivered;
}
