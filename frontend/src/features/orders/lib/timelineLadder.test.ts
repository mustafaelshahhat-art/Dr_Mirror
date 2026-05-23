import { describe, expect, it } from 'vitest';

import { ORDER_STATUSES } from '../types';

import { timelineLadder } from './timelineLadder';

describe('timelineLadder', () => {
  it('returns the fulfillment-only ladder for COD orders', () => {
    expect(timelineLadder('cod')).toEqual([
      ORDER_STATUSES.Confirmed,
      ORDER_STATUSES.Preparing,
      ORDER_STATUSES.Shipped,
      ORDER_STATUSES.Delivered,
    ]);
  });

  it('returns the payment-then-fulfillment ladder for proof-based orders', () => {
    expect(timelineLadder('proof')).toEqual([
      ORDER_STATUSES.Pending,
      ORDER_STATUSES.PendingPaymentReview,
      ORDER_STATUSES.Paid,
      ORDER_STATUSES.Preparing,
      ORDER_STATUSES.Shipped,
      ORDER_STATUSES.Delivered,
    ]);
  });
});
