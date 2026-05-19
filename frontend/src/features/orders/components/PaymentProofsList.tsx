import { useTranslation } from 'react-i18next';

import { type PaymentProofDto } from '../types';
import { PaymentProofFilePreview } from './PaymentProofFilePreview';
import { ProofStatusBadge } from './ProofStatusBadge';

/**
 * Read-only list of payment-proof uploads on an order. Each row shows a
 * thumbnail (image link opens full-size), the review status, the optional
 * admin note, and the upload timestamp.
 */
export function PaymentProofsList({
  orderNumber,
  proofs,
}: {
  orderNumber: string;
  proofs: PaymentProofDto[];
}) {
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
            className="content-surface flex gap-3 p-3"
          >
            <PaymentProofFilePreview
              orderNumber={orderNumber}
              proof={proof}
              alt={t('orders.proofs.imageAlt')}
              className="size-16 shrink-0 overflow-hidden rounded-medium bg-default-100"
              labels={{
                loading: t('orders.proofs.loadingImage'),
                unavailable: t('orders.proofs.imageUnavailable'),
                error: t('orders.proofs.imageLoadError'),
                open: t('orders.proofs.openFile'),
              }}
            />
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
                  {t('orders.proofs.reviewNoteQuoted', { note: proof.reviewNote })}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

