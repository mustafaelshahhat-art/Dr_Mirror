import { Button } from '@heroui/react';
import { UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';

import type { ProblemDetails } from '../../auth/types';
import { useUploadPaymentProofMutation } from '../hooks';

interface PaymentProofUploadProps {
  orderNumber: string;
}

/** Max upload size in bytes (10 MB), mirrors FileStorageOptions defaults. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Buyer's "Upload payment proof" card. Validates the file client-side
 * (size + MIME) before posting to <c>/api/orders/{n}/proof</c>. The mutation
 * already refreshes the order detail cache.
 */
export function PaymentProofUpload({ orderNumber }: PaymentProofUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const upload = useUploadPaymentProofMutation(orderNumber);

  // Revoke the blob URL when the component unmounts OR when previewUrl flips
  // to a new value. Without this the URL persists for the lifetime of the
  // document and we leak memory every time the buyer swaps files / navigates
  // away mid-pick.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onPickFile(file: File | null) {
    setClientError(null);
    setSelected(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setClientError(t('orders.upload.errors.tooLarge', { mb: 10 }));
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      setClientError(t('orders.upload.errors.unsupportedType'));
      return;
    }

    setSelected(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function submit() {
    if (!selected) return;
    try {
      await upload.mutateAsync(selected);
      // Reset local state on success — the mutation hook already invalidated.
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelected(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
      setClientError(
        problem?.detail ?? problem?.title ?? t('orders.upload.errors.unknown'),
      );
    }
  }

  return (
    <section
      aria-labelledby="proof-upload-heading"
      className="space-y-3 rounded-large border border-divider/60 bg-content1 p-4"
    >
      <header className="space-y-1">
        <h2 id="proof-upload-heading" className="text-sm font-semibold text-foreground">
          {t('orders.upload.heading')}
        </h2>
        <p className="text-xs text-default-500">{t('orders.upload.subtitle')}</p>
      </header>

      <label
        className="flex cursor-pointer items-center justify-center gap-2 rounded-medium border border-dashed border-divider px-4 py-6 text-sm text-default-700 transition-colors hover:bg-content2"
        htmlFor={`proof-input-${orderNumber}`}
      >
        <UploadCloud className="size-5 text-default-500" aria-hidden />
        <span>{selected ? selected.name : t('orders.upload.pickFile')}</span>
        <input
          id={`proof-input-${orderNumber}`}
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME.join(',')}
          className="sr-only"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {previewUrl ? (
        <img
          src={previewUrl}
          alt={t('orders.upload.previewAlt')}
          className="max-h-56 w-full rounded-medium border border-divider/60 object-contain"
        />
      ) : null}

      {clientError ? (
        <p role="alert" className="text-sm text-danger">
          {clientError}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          isDisabled={!selected || upload.isPending}
          onPress={() => void submit()}
        >
          {upload.isPending ? t('orders.upload.uploading') : t('orders.upload.submit')}
        </Button>
        {selected ? (
          <Button
            type="button"
            variant="ghost"
            isDisabled={upload.isPending}
            onPress={() => onPickFile(null)}
          >
            {t('orders.upload.clear')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
