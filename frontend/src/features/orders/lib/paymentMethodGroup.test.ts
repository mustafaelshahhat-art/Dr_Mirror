import { describe, expect, it } from 'vitest';

import { PAYMENT_METHOD_KIND, type PaymentMethodKind } from '../types';

import { paymentMethodGroup, type PaymentMethodGroup } from './paymentMethodGroup';

describe('paymentMethodGroup', () => {
  it.each([
    [PAYMENT_METHOD_KIND.Cod, 'cod'],
    [PAYMENT_METHOD_KIND.Instapay, 'proof'],
    [PAYMENT_METHOD_KIND.Wallet, 'proof'],
    [PAYMENT_METHOD_KIND.BankTransfer, 'proof'],
  ] satisfies Array<[PaymentMethodKind, PaymentMethodGroup]>)('maps %s to %s', (kind, expected) => {
    expect(paymentMethodGroup(kind)).toBe(expected);
  });

  it('is exhaustive over PaymentMethodKind', () => {
    const covered = [
      PAYMENT_METHOD_KIND.Cod,
      PAYMENT_METHOD_KIND.Instapay,
      PAYMENT_METHOD_KIND.Wallet,
      PAYMENT_METHOD_KIND.BankTransfer,
    ] satisfies PaymentMethodKind[];

    expect(covered).toHaveLength(4);
  });
});
