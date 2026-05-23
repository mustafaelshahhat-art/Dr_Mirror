import { PAYMENT_METHOD_KIND, type PaymentMethodKind } from '../types';

export type PaymentMethodGroup = 'cod' | 'proof';

function assertNever(_: never): never {
  throw new Error(`Unhandled PaymentMethodKind: ${String(_)}`);
}

export function paymentMethodGroup(kind: PaymentMethodKind): PaymentMethodGroup {
  switch (kind) {
    case PAYMENT_METHOD_KIND.Cod: return 'cod';
    case PAYMENT_METHOD_KIND.Instapay: return 'proof';
    case PAYMENT_METHOD_KIND.Wallet: return 'proof';
    case PAYMENT_METHOD_KIND.BankTransfer: return 'proof';
    default: {
      assertNever(kind);
    }
  }
}
