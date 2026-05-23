import { ORDER_STATUSES, type OrderStatus } from '../../orders/types';

export function adminTransitionActionKey(fromStatus: OrderStatus, toStatus: OrderStatus): string {
  if (toStatus === ORDER_STATUSES.Cancelled) {
    return 'admin.transition.actions.cancel';
  }
  if (fromStatus === ORDER_STATUSES.PendingPaymentReview && toStatus === ORDER_STATUSES.Paid) {
    return 'admin.transition.actions.approvePayment';
  }
  if (fromStatus === ORDER_STATUSES.PendingPaymentReview && toStatus === ORDER_STATUSES.Pending) {
    return 'admin.transition.actions.rejectPaymentProof';
  }
  if (toStatus === ORDER_STATUSES.Preparing) return 'admin.transition.actions.markPreparing';
  if (toStatus === ORDER_STATUSES.Shipped) return 'admin.transition.actions.markShipped';
  if (toStatus === ORDER_STATUSES.Delivered) return 'admin.transition.actions.markDelivered';

  return 'admin.transition.actions.unknown';
}
