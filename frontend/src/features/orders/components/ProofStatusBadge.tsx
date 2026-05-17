import { useTranslation } from 'react-i18next';

import { PAYMENT_PROOF_STATUS, type PaymentProofStatus } from '../types';

/**
 * Status pill for a payment-proof record. Used in two surfaces with slightly
 * different copy keys (the admin queue says "Awaiting review", the buyer order
 * detail says whatever the orders.proofs.status namespace provides). `tone`
 * picks which namespace to read — colors are the same either way.
 */
export function ProofStatusBadge({
  status,
  tone = 'buyer',
}: {
  status: PaymentProofStatus;
  tone?: 'admin' | 'buyer';
}) {
  const { t } = useTranslation();
  const classes =
    status === PAYMENT_PROOF_STATUS.Approved
      ? 'bg-success/15 text-success border-success/30'
      : status === PAYMENT_PROOF_STATUS.Rejected
        ? 'bg-danger/15 text-danger border-danger/30'
        : 'bg-warning/15 text-warning border-warning/30';

  const prefix = tone === 'admin' ? 'admin.proofs.status' : 'orders.proofs.status';
  const label =
    status === PAYMENT_PROOF_STATUS.Approved
      ? t(`${prefix}.approved`)
      : status === PAYMENT_PROOF_STATUS.Rejected
        ? t(`${prefix}.rejected`)
        : t(`${prefix}.pending`);

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
        classes,
      ].join(' ')}
    >
      {label}
    </span>
  );
}
