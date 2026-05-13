import { useTranslation } from 'react-i18next';

import { ORDER_STATUSES, type OrderStatus } from '../types';

/**
 * Translation key for each status. Lookup table only — caller passes
 * <c>t(orderStatusTranslationKey(status))</c>.
 */
export function orderStatusTranslationKey(status: OrderStatus): string {
  switch (status) {
    case ORDER_STATUSES.Pending:
      return 'orders.status.pending';
    case ORDER_STATUSES.Confirmed:
      return 'orders.status.confirmed';
    case ORDER_STATUSES.PendingPaymentReview:
      return 'orders.status.pendingPaymentReview';
    case ORDER_STATUSES.Paid:
      return 'orders.status.paid';
    case ORDER_STATUSES.Preparing:
      return 'orders.status.preparing';
    case ORDER_STATUSES.Shipped:
      return 'orders.status.shipped';
    case ORDER_STATUSES.Delivered:
      return 'orders.status.delivered';
    case ORDER_STATUSES.Cancelled:
      return 'orders.status.cancelled';
    default:
      return 'orders.status.unknown';
  }
}

/** Tailwind classes per status — terminal states muted, active states accented. */
function statusToneClasses(status: OrderStatus): string {
  switch (status) {
    case ORDER_STATUSES.Pending:
    case ORDER_STATUSES.PendingPaymentReview:
      return 'bg-warning/15 text-warning border-warning/30';
    case ORDER_STATUSES.Confirmed:
    case ORDER_STATUSES.Paid:
      return 'bg-primary/15 text-primary border-primary/30';
    case ORDER_STATUSES.Preparing:
    case ORDER_STATUSES.Shipped:
      return 'bg-secondary/15 text-secondary border-secondary/30';
    case ORDER_STATUSES.Delivered:
      return 'bg-success/15 text-success border-success/30';
    case ORDER_STATUSES.Cancelled:
      return 'bg-danger/15 text-danger border-danger/30';
    default:
      return 'bg-default-100 text-default-700 border-divider';
  }
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-none',
        statusToneClasses(status),
      ].join(' ')}
    >
      {t(orderStatusTranslationKey(status))}
    </span>
  );
}
