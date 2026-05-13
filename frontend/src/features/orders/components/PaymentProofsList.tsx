import { useTranslation } from 'react-i18next';

import {
  PAYMENT_PROOF_STATUS,
  type PaymentProofDto,
  type PaymentProofStatus,
} from '../types';

/**
 * Read-only list of payment-proof uploads on an order. Each row shows a
 * thumbnail (image link opens full-size), the review status, the optional
 * admin note, and the upload timestamp.
 */
export function PaymentProofsList({ proofs }: { proofs: PaymentProofDto[] }) {
  const { t, i18n } = useTranslation();
  const dateFmt = new Intl.DateTimeFormat(
    i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US',
    { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' },
  );

  if (proofs.length === 0) return null;

  return (
    <section aria-labelledby="payment-proofs-heading" className="space-y-3">
      <h2 id="payment-proofs-heading" className="text-sm font-semibold text-foreground">
        {t('orders.proofs.heading')}
      </h2>
      <ul className="space-y-2">
        {proofs.map((proof) => (
          <li
            key={proof.id}
            className="flex gap-3 rounded-medium border border-divider/60 bg-content1 p-3"
          >
            <a
              href={proof.fileUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="size-16 shrink-0 overflow-hidden rounded-medium bg-default-100"
            >
              <img
                src={proof.fileUrl}
                alt={t('orders.proofs.imageAlt')}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </a>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <ProofStatusBadge status={proof.status} />
                <span className="text-xs text-default-500 tabular-nums">
                  {dateFmt.format(new Date(proof.uploadedAt))}
                </span>
              </div>
              {proof.reviewedAt ? (
                <p className="text-xs text-default-500">
                  {t('orders.proofs.reviewedAt', {
                    when: dateFmt.format(new Date(proof.reviewedAt)),
                    by: proof.reviewedByUserName ?? '',
                  })}
                </p>
              ) : null}
              {proof.reviewNote ? (
                <p className="rounded-medium bg-content2 px-2 py-1 text-xs text-foreground">
                  &ldquo;{proof.reviewNote}&rdquo;
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProofStatusBadge({ status }: { status: PaymentProofStatus }) {
  const { t } = useTranslation();
  const classes =
    status === PAYMENT_PROOF_STATUS.Approved
      ? 'bg-success/15 text-success border-success/30'
      : status === PAYMENT_PROOF_STATUS.Rejected
        ? 'bg-danger/15 text-danger border-danger/30'
        : 'bg-warning/15 text-warning border-warning/30';
  const label =
    status === PAYMENT_PROOF_STATUS.Approved
      ? t('orders.proofs.status.approved')
      : status === PAYMENT_PROOF_STATUS.Rejected
        ? t('orders.proofs.status.rejected')
        : t('orders.proofs.status.pending');
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
