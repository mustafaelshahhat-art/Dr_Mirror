import { ORDER_STATUSES, type OrderStatus } from '../types';

/** Translation key for each status. Caller passes `t(orderStatusTranslationKey(status))`. */
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
