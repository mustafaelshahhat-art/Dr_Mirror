import { describe, expect, it } from 'vitest';

import { ORDER_STATUSES } from '../../orders/types';

import { adminTransitionActionKey } from './adminTransitionActionKey';

describe('adminTransitionActionKey', () => {
  it.each([
    [ORDER_STATUSES.PendingPaymentReview, ORDER_STATUSES.Paid, 'admin.transition.actions.approvePayment'],
    [ORDER_STATUSES.PendingPaymentReview, ORDER_STATUSES.Pending, 'admin.transition.actions.rejectPaymentProof'],
    [ORDER_STATUSES.Confirmed, ORDER_STATUSES.Preparing, 'admin.transition.actions.markPreparing'],
    [ORDER_STATUSES.Paid, ORDER_STATUSES.Preparing, 'admin.transition.actions.markPreparing'],
    [ORDER_STATUSES.Preparing, ORDER_STATUSES.Shipped, 'admin.transition.actions.markShipped'],
    [ORDER_STATUSES.Shipped, ORDER_STATUSES.Delivered, 'admin.transition.actions.markDelivered'],
    [ORDER_STATUSES.Pending, ORDER_STATUSES.Cancelled, 'admin.transition.actions.cancel'],
    [ORDER_STATUSES.Confirmed, ORDER_STATUSES.Cancelled, 'admin.transition.actions.cancel'],
    [ORDER_STATUSES.Paid, ORDER_STATUSES.Cancelled, 'admin.transition.actions.cancel'],
  ])('maps %s -> %s to %s', (fromStatus, toStatus, expected) => {
    expect(adminTransitionActionKey(fromStatus, toStatus)).toBe(expected);
  });
});
