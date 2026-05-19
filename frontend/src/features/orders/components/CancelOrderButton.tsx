import { AlertDialog, Button, Label, TextArea, useOverlayState } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCancelOrderMutation } from '../hooks';
import { ORDER_STATUSES, type OrderDetailDto } from '../types';

/**
 * Buyer-side cancel button. Hidden unless the FSM allows the buyer to move
 * the order to Cancelled (which the server reports via
 * <c>order.allowedNextStatesForBuyer</c>). Opens an AlertDialog (A.6) for
 * the reason field + hard confirm — so misclicks don't fire.
 */
export function CancelOrderButton({ order }: { order: OrderDetailDto }) {
  const { t } = useTranslation();
  const cancel = useCancelOrderMutation(order.orderNumber);
  const dialogState = useOverlayState({ defaultOpen: false });
  const [reason, setReason] = useState('');

  const buyerCanCancel = order.allowedNextStatesForBuyer.includes(
    ORDER_STATUSES.Cancelled,
  );

  if (!buyerCanCancel) return null;

  async function submit() {
    try {
      await cancel.mutateAsync({ reason: reason.trim() || null });
      dialogState.close();
      setReason('');
    } catch {
      // Toast emitted by mutation onError.
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onPress={() => dialogState.open()}
        className="text-danger hover:bg-danger/10"
      >
        {t('orders.cancel.button')}
      </Button>
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={dialogState.isOpen}
          isDismissable={false}
          onOpenChange={(open) => {
            dialogState.setOpen(open);
            if (!open && !cancel.isPending) setReason('');
          }}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>{t('orders.cancel.confirmHeading')}</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body className="space-y-2">
                    <p className="text-sm text-default-700 dark:text-default-300">
                      {t('orders.cancel.confirmSubtitle')}
                    </p>
                    <Label className="sr-only">{t('orders.cancel.reasonPlaceholder')}</Label>
                    <TextArea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      maxLength={500}
                      fullWidth
                      placeholder={t('orders.cancel.reasonPlaceholder')}
                      className="text-sm text-start"
                    />
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isDisabled={cancel.isPending}
                      onPress={close}
                    >
                      {t('orders.cancel.dismiss')}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      isDisabled={cancel.isPending}
                      onPress={() => void submit()}
                    >
                      {cancel.isPending ? t('orders.cancel.cancelling') : t('orders.cancel.confirm')}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
