import { Button } from '@heroui/react';
import { Check, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../../auth/types';
import {
  PAYMENT_PROOF_STATUS,
  type PaymentProofDto,
  type PaymentProofStatus,
} from '../../orders/types';
import { useApproveProofMutation, useRejectProofMutation } from '../hooks';

interface AdminProofReviewProps {
  orderNumber: string;
  proofs: PaymentProofDto[];
}

/**
 * Admin payment-proof review. Renders every uploaded proof with reviewer +
 * timestamp + note metadata; pending proofs additionally get Approve / Reject
 * inline actions. Reject requires a note (mirrors backend
 * <c>RejectPaymentProofValidator</c>); Approve accepts an optional note.
 */
export function AdminProofReview({ orderNumber, proofs }: AdminProofReviewProps) {
  const { t, i18n } = useTranslation();
  const dateFmt = new Intl.DateTimeFormat(
    i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US',
    { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' },
  );

  if (proofs.length === 0) {
    return (
      <p className="text-sm text-default-500">{t('admin.proofs.noneYet')}</p>
    );
  }

  return (
    <ul className="space-y-3">
      {proofs.map((proof) => (
        <li key={proof.id}>
          <ProofRow
            proof={proof}
            orderNumber={orderNumber}
            dateFmt={dateFmt}
          />
        </li>
      ))}
    </ul>
  );
}

function ProofRow({
  proof,
  orderNumber,
  dateFmt,
}: {
  proof: PaymentProofDto;
  orderNumber: string;
  dateFmt: Intl.DateTimeFormat;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const approve = useApproveProofMutation({ orderNumber });
  const reject = useRejectProofMutation({ orderNumber });

  const isPending = proof.status === PAYMENT_PROOF_STATUS.Pending;

  async function submit() {
    setError(null);
    try {
      if (mode === 'approve') {
        await approve.mutateAsync({
          proofId: proof.id,
          reviewNote: note.trim() || null,
        });
      } else if (mode === 'reject') {
        if (note.trim().length === 0) {
          setError(t('admin.proofs.rejectReasonRequired'));
          return;
        }
        await reject.mutateAsync({ proofId: proof.id, reviewNote: note.trim() });
      }
      setMode('idle');
      setNote('');
    } catch (err) {
      const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
      setError(problem?.detail ?? problem?.title ?? t('admin.proofs.errorUnknown'));
    }
  }

  const inFlight = approve.isPending || reject.isPending;

  return (
    <div className="space-y-2 rounded-medium border border-divider/60 bg-content1 p-3">
      <div className="flex gap-3">
        <a
          href={proof.fileUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="size-20 shrink-0 overflow-hidden rounded-medium bg-default-100"
        >
          <img
            src={proof.fileUrl}
            alt={t('admin.proofs.imageAlt')}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ProofStatusBadge status={proof.status} />
            <span className="text-xs text-default-500 tabular-nums">
              {dateFmt.format(new Date(proof.uploadedAt))}
            </span>
          </div>
          {proof.reviewedAt ? (
            <p className="mt-1 text-xs text-default-500">
              {t('admin.proofs.reviewedAt', {
                when: dateFmt.format(new Date(proof.reviewedAt)),
                by: proof.reviewedByUserName ?? '',
              })}
            </p>
          ) : null}
          {proof.reviewNote ? (
            <p className="mt-1 rounded-medium bg-content2 px-2 py-1 text-xs text-foreground">
              &ldquo;{proof.reviewNote}&rdquo;
            </p>
          ) : null}
        </div>
      </div>

      {isPending ? (
        mode === 'idle' ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onPress={() => {
                setMode('approve');
                setNote('');
                setError(null);
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4" aria-hidden />
                {t('admin.proofs.approve')}
              </span>
            </Button>
            <Button
              type="button"
              variant="danger-soft"
              size="sm"
              onPress={() => {
                setMode('reject');
                setNote('');
                setError(null);
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <X className="size-4" aria-hidden />
                {t('admin.proofs.reject')}
              </span>
            </Button>
          </div>
        ) : (
          <div className="space-y-2 rounded-medium border border-divider/60 bg-content2 p-2">
            <p className="text-xs font-medium text-foreground">
              {mode === 'approve'
                ? t('admin.proofs.approveConfirm')
                : t('admin.proofs.rejectConfirm')}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={
                mode === 'reject'
                  ? t('admin.proofs.notePlaceholderRequired')
                  : t('admin.proofs.notePlaceholderOptional')
              }
              className="w-full rounded-medium border border-divider bg-content1 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error ? (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'reject' ? 'danger' : 'primary'}
                size="sm"
                isDisabled={inFlight}
                onPress={() => void submit()}
              >
                {inFlight
                  ? t('admin.proofs.submitting')
                  : t('admin.proofs.confirm')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isDisabled={inFlight}
                onPress={() => {
                  setMode('idle');
                  setNote('');
                  setError(null);
                }}
              >
                {t('admin.proofs.cancel')}
              </Button>
            </div>
          </div>
        )
      ) : null}
    </div>
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
      ? t('admin.proofs.status.approved')
      : status === PAYMENT_PROOF_STATUS.Rejected
        ? t('admin.proofs.status.rejected')
        : t('admin.proofs.status.pending');
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
