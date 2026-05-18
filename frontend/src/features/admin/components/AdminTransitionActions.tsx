import { Button, Modal, TextArea, useOverlayState } from '@heroui/react';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../../auth/types';
import { orderStatusTranslationKey } from '../../orders/components/orderStatusTranslationKey';
import { ORDER_STATUSES, type OrderDetailDto, type OrderStatus } from '../../orders/types';
import { useAdminTransitionMutation } from '../hooks';

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

  if (order.allowedNextStatesForAdmin.length === 0) {
    return (
      <p className="text-xs text-default-500">
        {t('admin.transition.terminalState')}
      </p>
    );
  }

  const isCancelling = target === ORDER_STATUSES.Cancelled;

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
      // Reset panel on success; the new allowedNextStatesForAdmin will drive
      // the next render anyway.
      if (cancelState.isOpen) cancelState.close();
      setTarget(null);
      setReason('');
    } catch (err) {
      const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
      setError(problem?.detail ?? problem?.title ?? t('admin.transition.errorUnknown'));
    }
  }

  return (
    <section
      aria-labelledby="transition-heading"
      className="space-y-3 rounded-large border border-divider/60 bg-content1 p-4"
    >
      <h2 id="transition-heading" className="text-sm font-semibold text-foreground">
        {t('admin.transition.heading')}
      </h2>

      <div className="flex flex-wrap gap-2">
        {order.allowedNextStatesForAdmin.map((status) => {
          const isCancel = status === ORDER_STATUSES.Cancelled;
          const isActive = status === target;
          return (
            <Button
              key={status}
              type="button"
              variant={isCancel ? 'danger-soft' : isActive ? 'primary' : 'outline'}
              size="sm"
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
              {t(orderStatusTranslationKey(status))}
            </Button>
          );
        })}
      </div>

      {target !== null && !isCancelling ? (
        <div className="space-y-2 rounded-medium border border-divider/60 bg-content2 p-3">
          <p className="text-sm font-medium">
            {t('admin.transition.confirmHeading', {
              status: t(orderStatusTranslationKey(target)),
            })}
          </p>
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
            className="text-sm text-start"
          />
          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
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

      <Modal>
        <Modal.Backdrop
          isOpen={cancelState.isOpen}
          onOpenChange={(open) => {
            cancelState.setOpen(open);
            if (!open && !transition.isPending) {
              setTarget(null);
              setReason('');
              setError(null);
            }
          }}
        >
          <Modal.Container size="sm">
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.Header>
                    <Modal.Heading>
                      {t('admin.transition.confirmHeading', {
                        status: t(orderStatusTranslationKey(ORDER_STATUSES.Cancelled)),
                      })}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <TextArea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      maxLength={500}
                      fullWidth
                      placeholder={t('admin.transition.reasonPlaceholderRequired')}
                      className="text-sm text-start"
                    />
                    {error ? (
                      <p role="alert" className="text-xs text-danger">
                        {error}
                      </p>
                    ) : null}
                  </Modal.Body>
                  <Modal.Footer>
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
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </section>
  );
}
