import { useTranslation } from 'react-i18next';

import { ORDER_STATUSES, type OrderStatus } from '../types';

import { orderStatusTranslationKey } from './orderStatusTranslationKey';

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
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium leading-none',
        statusToneClasses(status),
      ].join(' ')}
    >
      {t(orderStatusTranslationKey(status))}
    </span>
  );
}
