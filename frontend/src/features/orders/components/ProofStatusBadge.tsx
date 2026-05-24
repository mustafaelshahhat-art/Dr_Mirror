import { useTranslation } from 'react-i18next';
import { PAYMENT_PROOF_STATUS, type PaymentProofStatus } from '../types';
import { StatusBadge, type StatusColor } from '../../../shared/components/StatusPill';

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
  
  const color: StatusColor =
    status === PAYMENT_PROOF_STATUS.Approved
      ? 'success'
      : status === PAYMENT_PROOF_STATUS.Rejected
        ? 'danger'
        : 'warning';

  const prefix = tone === 'admin' ? 'admin.proofs.status' : 'orders.proofs.status';
  const label =
    status === PAYMENT_PROOF_STATUS.Approved
      ? t(`${prefix}.approved`)
      : status === PAYMENT_PROOF_STATUS.Rejected
        ? t(`${prefix}.rejected`)
        : t(`${prefix}.pending`);

  return (
    <StatusBadge color={color} label={label} />
  );
}
