import { ORDER_STATUSES, type OrderStatus } from '../types';

import type { PaymentMethodGroup } from './paymentMethodGroup';

export function timelineLadder(group: PaymentMethodGroup): OrderStatus[] {
  if (group === 'cod') {
    return [
      ORDER_STATUSES.Confirmed,
      ORDER_STATUSES.Preparing,
      ORDER_STATUSES.Shipped,
      ORDER_STATUSES.Delivered,
    ];
  }
  return [
    ORDER_STATUSES.Pending,
    ORDER_STATUSES.PendingPaymentReview,
    ORDER_STATUSES.Paid,
    ORDER_STATUSES.Preparing,
    ORDER_STATUSES.Shipped,
    ORDER_STATUSES.Delivered,
  ];
}
