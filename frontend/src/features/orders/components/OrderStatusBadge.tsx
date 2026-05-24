import { useTranslation } from 'react-i18next';
import { ORDER_STATUSES, type OrderStatus } from '../types';
import { orderStatusTranslationKey } from './orderStatusTranslationKey';
import { StatusBadge, type StatusColor } from '../../../shared/components/StatusPill';

function assertNever(_: never): never {
  throw new Error(`Unhandled OrderStatus: ${String(_)}`);
}

function statusColor(status: OrderStatus): StatusColor {
  switch (status) {
    case ORDER_STATUSES.Pending:
    case ORDER_STATUSES.PendingPaymentReview:
      return 'warning';
    case ORDER_STATUSES.Confirmed:
    case ORDER_STATUSES.Paid:
      return 'accent';
    case ORDER_STATUSES.Preparing:
    case ORDER_STATUSES.Shipped:
      return 'default';
    case ORDER_STATUSES.Delivered:
      return 'success';
    case ORDER_STATUSES.Cancelled:
      return 'danger';
    default:
      assertNever(status);
  }
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  return (
    <StatusBadge 
      color={statusColor(status)} 
      label={t(orderStatusTranslationKey(status))} 
    />
  );
}
