import { Button, Modal, TextArea, useOverlayState } from '@heroui/react';
import { Check, Download, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../../auth/types';
import { ordersApi } from '../../orders/api';
import { PaymentProofFilePreview } from '../../orders/components/PaymentProofFilePreview';
import { ProofStatusBadge } from '../../orders/components/ProofStatusBadge';
import {
  PAYMENT_PROOF_STATUS,
  type PaymentProofDto,
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

  const latestPendingId = [...proofs]
    .filter((p) => p.status === PAYMENT_PROOF_STATUS.Pending)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0]
    ?.id;

  return (
    <ul className="space-y-3">
      {proofs.map((proof) => (
        <li key={proof.id}>
          <ProofRow
            proof={proof}
            orderNumber={orderNumber}
            dateFmt={dateFmt}
            isLatestPending={proof.id === latestPendingId}
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
  isLatestPending,
}: {
  proof: PaymentProofDto;
  orderNumber: string;
  dateFmt: Intl.DateTimeFormat;
  isLatestPending: boolean;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const approve = useApproveProofMutation({ orderNumber });
  const reject = useRejectProofMutation({ orderNumber });
  const rejectState = useOverlayState({ defaultOpen: false });

  const isPending = proof.status === PAYMENT_PROOF_STATUS.Pending;
  const isSuperseded = isPending && !isLatestPending;

  async function downloadProof() {
    setDownloadError(null);
    setIsDownloading(true);
    let objectUrl: string | null = null;
    try {
      const blob = await ordersApi.getPaymentProofFile(orderNumber, proof.id);
      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = getProofDownloadFileName(orderNumber, proof);
      link.rel = 'noreferrer noopener';
      document.body.append(link);
      link.click();
      link.remove();
    } catch {
      setDownloadError(t('admin.proofs.downloadError'));
    } finally {
      setIsDownloading(false);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

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
      if (rejectState.isOpen) rejectState.close();
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
        <PaymentProofFilePreview
          orderNumber={orderNumber}
          proof={proof}
          alt={t('admin.proofs.imageAlt')}
          className="size-20 shrink-0 overflow-hidden rounded-medium bg-default-100"
          labels={{
            loading: t('admin.proofs.loadingImage'),
            unavailable: t('admin.proofs.imageUnavailable'),
            error: t('admin.proofs.imageLoadError'),
            open: t('admin.proofs.openFile'),
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ProofStatusBadge status={proof.status} tone="admin" />
            {isSuperseded ? (
              <span className="inline-flex items-center rounded-md border border-default-300 bg-default-100 px-2 py-0.5 text-xs font-medium text-default-500">
                {t('admin.proofs.superseded')}
              </span>
            ) : null}
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
              {t('orders.proofs.reviewNoteQuoted', { note: proof.reviewNote })}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isDisabled={isDownloading}
              onPress={() => void downloadProof()}
            >
              <span className="inline-flex items-center gap-1.5">
                <Download className="size-4" aria-hidden />
                {isDownloading ? t('admin.proofs.downloadingFile') : t('admin.proofs.downloadFile')}
              </span>
            </Button>
            {downloadError ? (
              <p role="alert" className="text-xs text-danger">
                {downloadError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {isPending && !isSuperseded ? (
        mode === 'idle' ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onPress={() => {
                // eslint-disable-next-line i18next/no-literal-string -- state machine value, not user copy
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
                // eslint-disable-next-line i18next/no-literal-string -- state machine value, not user copy
                setMode('reject');
                setNote('');
                setError(null);
                rejectState.open();
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <X className="size-4" aria-hidden />
                {t('admin.proofs.reject')}
              </span>
            </Button>
          </div>
        ) : mode === 'approve' ? (
          <div className="space-y-2 rounded-medium border border-divider/60 bg-content2 p-2">
            <p className="text-xs font-medium text-foreground">
              {t('admin.proofs.approveConfirm')}
            </p>
            <TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              fullWidth
              placeholder={
                t('admin.proofs.notePlaceholderOptional')
              }
              className="text-sm text-start"
            />
            {error ? (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="primary"
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
                  // eslint-disable-next-line i18next/no-literal-string -- state machine value, not user copy
                  setMode('idle');
                  setNote('');
                  setError(null);
                }}
              >
                {t('admin.proofs.cancel')}
              </Button>
            </div>
          </div>
        ) : null
      ) : null}
      <Modal>
        <Modal.Backdrop
          isOpen={rejectState.isOpen}
          onOpenChange={(open) => {
            rejectState.setOpen(open);
            if (!open && !inFlight) {
              setMode('idle');
              setNote('');
              setError(null);
            }
          }}
        >
          <Modal.Container size="sm">
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.Header>
                    <Modal.Heading>{t('admin.proofs.reject')}</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <p className="text-sm font-medium">
                      {t('admin.proofs.rejectConfirm')}
                    </p>
                    <TextArea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      maxLength={500}
                      fullWidth
                      placeholder={t('admin.proofs.notePlaceholderRequired')}
                      className="text-sm text-start"
                    />
                    {error ? (
                      <p role="alert" className="text-xs text-danger">
                        {error}
                      </p>
                    ) : null}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isDisabled={inFlight}
                      onPress={close}
                    >
                      {t('admin.proofs.cancel')}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      isDisabled={inFlight}
                      onPress={() => void submit()}
                    >
                      {inFlight
                        ? t('admin.proofs.submitting')
                        : t('admin.proofs.confirm')}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

function getProofDownloadFileName(orderNumber: string, proof: PaymentProofDto) {
  if (proof.originalFileName) return sanitiseDownloadFileName(proof.originalFileName);

  const extensionByContentType: Record<string, string> = {
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const extension = extensionByContentType[proof.contentType.toLowerCase()] ?? 'jpg';

  return `payment-proof-${orderNumber}-${proof.id}.${extension}`;
}

function sanitiseDownloadFileName(fileName: string) {
  const cleaned = fileName.replace(/[\\/:*?"<>|]+/g, '-').trim();
  return cleaned.length > 0 ? cleaned : 'payment-proof';
}

