import { ORDER_STATUSES, type OrderStatus } from '../types';

function assertNever(_: never): never {
  throw new Error(`Unhandled OrderStatus: ${String(_)}`);
}

export function orderStatusTranslationKey(status: OrderStatus): string {
  // No unknown fallback: rendering a placeholder like "Status" is worse than
  // failing fast when a new backend status is added without a translation.
  switch (status) {
    case ORDER_STATUSES.Pending:
      return 'orders.status.pending';
    case ORDER_STATUSES.Confirmed:
      return 'orders.status.orderPlaced';
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
      assertNever(status);
  }
}
