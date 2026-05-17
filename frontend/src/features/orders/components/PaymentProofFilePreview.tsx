import { ImageOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ordersApi } from '../api';
import type { PaymentProofDto } from '../types';

type ProofFileState =
  | { status: 'loading'; url: null; isImage: false }
  | { status: 'ready'; url: string; isImage: boolean }
  | { status: 'error'; url: null; isImage: false };

interface PaymentProofFilePreviewProps {
  orderNumber: string;
  proof: PaymentProofDto;
  alt: string;
  className: string;
  labels: {
    loading: string;
    unavailable: string;
    error: string;
    open: string;
  };
}

export function PaymentProofFilePreview({
  orderNumber,
  proof,
  alt,
  className,
  labels,
}: PaymentProofFilePreviewProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<ProofFileState>({
    status: 'loading',
    url: null,
    isImage: false,
  });
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    let cancelled = false;

    setFile({ status: 'loading', url: null, isImage: false });
    setImageFailed(false);

    ordersApi
      .getPaymentProofFile(orderNumber, proof.id, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setFile({
          status: 'ready',
          url: objectUrl,
          isImage: (blob.type || proof.contentType).startsWith('image/'),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setFile({ status: 'error', url: null, isImage: false });
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orderNumber, proof.contentType, proof.id]);

  if (file.status === 'loading') {
    return (
      <div className={`${className} animate-pulse bg-default-100`} role="status">
        <span className="sr-only">{labels.loading}</span>
      </div>
    );
  }

  if (file.status === 'error') {
    return (
      <div
        className={`${className} flex items-center justify-center bg-default-100 text-default-400`}
        role="img"
        aria-label={labels.error}
        title={labels.error}
      >
        <ImageOff className="size-5" aria-hidden />
      </div>
    );
  }

  const previewLabel = imageFailed || !file.isImage ? labels.unavailable : alt;

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer noopener"
      className={className}
      aria-label={labels.open}
      title={labels.open}
    >
      {file.isImage && !imageFailed ? (
        <img
          src={file.url}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-default-100 text-default-400"
          role="img"
          aria-label={previewLabel || t('orders.proofs.imageUnavailable')}
        >
          <ImageOff className="size-5" aria-hidden />
        </div>
      )}
    </a>
  );
}
