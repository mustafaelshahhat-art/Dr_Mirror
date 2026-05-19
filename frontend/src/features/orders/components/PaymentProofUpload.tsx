import { Button, ProgressBar } from '@heroui/react';
import { UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePaymentProofUploadConfigQuery, useUploadPaymentProofMutation } from '../hooks';

interface PaymentProofUploadProps {
  orderNumber: string;
}

const BYTES_PER_MEGABYTE = 1024 * 1024;
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.pdf';

/**
 * Buyer's "Upload payment proof" card. Validates the file client-side
 * (size + MIME) before posting to <c>/api/orders/{n}/proof</c>. The mutation
 * already refreshes the order detail cache.
 */
export function PaymentProofUpload({ orderNumber }: PaymentProofUploadProps) {
  const { t, i18n } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const uploadConfig = usePaymentProofUploadConfigQuery();
  const upload = useUploadPaymentProofMutation(orderNumber);
  const maxUploadBytes = uploadConfig.data?.maxFileSizeBytes ?? null;
  const maxUploadMb = maxUploadBytes
    ? formatUploadLimitMb(maxUploadBytes, i18n.language)
    : null;
  const canPickFile = Boolean(maxUploadBytes) && !uploadConfig.isError;

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

    if (!maxUploadBytes || !maxUploadMb) {
      setClientError(t('orders.upload.errors.configUnavailable'));
      return;
    }

    if (file.size > maxUploadBytes) {
      setClientError(t('orders.upload.errors.tooLarge', { mb: maxUploadMb }));
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      setClientError(t('orders.upload.errors.unsupportedType'));
      return;
    }

    setSelected(file);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function submit() {
    if (!selected) return;
    try {
      await upload.mutateAsync(selected);
      // Reset local state on success; the mutation hook already invalidated.
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelected(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      setClientError(t('orders.upload.errors.unknown'));
    }
  }

  return (
    <section
      aria-labelledby="proof-upload-heading"
      className="content-surface space-y-3 p-4"
    >
      <header className="space-y-1">
        <h2 id="proof-upload-heading" className="text-sm font-semibold text-foreground">
          {t('orders.upload.heading')}
        </h2>
        <p className="text-xs text-default-500">
          {maxUploadMb
            ? t('orders.upload.subtitle', { mb: maxUploadMb })
            : uploadConfig.isError
              ? t('orders.upload.requirementsUnavailable')
              : t('orders.upload.loadingRequirements')}
        </p>
      </header>

      <label
        className={`flex items-center justify-center gap-2 rounded-medium border border-dashed border-divider px-4 py-6 text-sm text-default-700 transition-colors ${canPickFile ? 'cursor-pointer hover:bg-content2' : 'cursor-not-allowed opacity-60'}`}
        htmlFor={`proof-input-${orderNumber}`}
      >
        <UploadCloud className="size-5 text-default-500" aria-hidden />
        <span>{selected ? selected.name : t('orders.upload.pickFile')}</span>
        {/* Exception 3 — rejected-primitive trail (per
            specs/003-heroui-migration/contracts/exceptions-register.md, criterion 5):
              - HeroUI `FileTrigger` / `FileInput`: considered and rejected — not exported
                by @heroui/react v3.0.4.
              - React Aria `FileTrigger` direct usage: considered and rejected — would
                violate FR-014 (no React Aria imports in app code; HeroUI is the boundary).
            The visible affordance is the styled <label> above (purely presentational);
            the sr-only native <input type="file"> only handles the OS file picker. */}
        <input
          id={`proof-input-${orderNumber}`}
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          disabled={!canPickFile}
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

      {upload.isPending ? (
        <ProgressBar
          isIndeterminate
          size="sm"
          aria-label={t('orders.upload.uploading')}
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      ) : null}
    </section>
  );
}

function formatUploadLimitMb(bytes: number, language: string | undefined) {
  const value = bytes / BYTES_PER_MEGABYTE;
  return new Intl.NumberFormat(language?.startsWith('ar') ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
    numberingSystem: 'latn',
  }).format(value);
}
