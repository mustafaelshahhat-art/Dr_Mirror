import { Button, TextArea } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCancelOrderMutation } from '../hooks';
import { ORDER_STATUSES, type OrderDetailDto } from '../types';

/**
 * Buyer-side cancel button. Hidden unless the FSM allows the buyer to move
 * the order to Cancelled (which the server reports via
 * <c>order.allowedNextStatesForBuyer</c>). Inline reason field with a soft
 * confirm step so misclicks don't fire.
 */
export function CancelOrderButton({ order }: { order: OrderDetailDto }) {
  const { t } = useTranslation();
  const cancel = useCancelOrderMutation(order.orderNumber);
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState('');

  const buyerCanCancel = order.allowedNextStatesForBuyer.includes(
    ORDER_STATUSES.Cancelled,
  );

  if (!buyerCanCancel) return null;

  async function submit() {
    try {
      await cancel.mutateAsync({ reason: reason.trim() || null });
      setExpanded(false);
      setReason('');
    } catch {
      // Toast emitted by mutation onError.
    }
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="ghost"
        onPress={() => setExpanded(true)}
        className="text-danger hover:bg-danger/10"
      >
        {t('orders.cancel.button')}
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-medium border border-danger/30 bg-danger/5 p-3">
      <p className="text-sm font-medium text-danger">{t('orders.cancel.confirmHeading')}</p>
      <p className="text-xs text-default-700 dark:text-default-300">
        {t('orders.cancel.confirmSubtitle')}
      </p>
      <TextArea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={500}
        fullWidth
        placeholder={t('orders.cancel.reasonPlaceholder')}
        className="text-sm text-start"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="danger"
          isDisabled={cancel.isPending}
          onPress={() => void submit()}
        >
          {cancel.isPending ? t('orders.cancel.cancelling') : t('orders.cancel.confirm')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          isDisabled={cancel.isPending}
          onPress={() => {
            setExpanded(false);
            setReason('');
          }}
        >
          {t('orders.cancel.dismiss')}
        </Button>
      </div>
    </div>
  );
}
