import { Button } from '@heroui/react';
import { isAxiosError } from 'axios';
import { Trash2, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../../../auth/types';
import {
  useDeleteImageMutation,
  useUpdateImageMutation,
  useUploadImageMutation,
} from '../hooks';
import type { AdminProductDetailDto } from '../types';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function ProductImagesSection({ product }: { product: AdminProductDetailDto }) {
  const { t } = useTranslation();
  const uploadMutation = useUploadImageMutation(product.id);
  const updateMutation = useUpdateImageMutation(product.id);
  const deleteMutation = useDeleteImageMutation(product.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPickFile(file: File | null) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(t('admin.products.images.errors.tooLarge', { mb: 10 }));
      return;
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError(t('admin.products.images.errors.unsupportedType'));
      return;
    }
    try {
      await uploadMutation.mutateAsync(file);
    } catch (err) {
      const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
      setError(problem?.detail ?? problem?.title ?? t('admin.products.errors.unknown'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <article className="rounded-large border border-divider/60 bg-content1 p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-default-600">
          {t('admin.products.images.heading')}
        </h2>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-medium border border-divider bg-content2 px-3 py-1.5 text-sm hover:bg-default-100">
          <UploadCloud className="size-4" aria-hidden />
          {uploadMutation.isPending ? t('admin.products.images.uploading') : t('admin.products.images.upload')}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MIME.join(',')}
            className="sr-only"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </header>

      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

      {product.images.length === 0 ? (
        <p className="rounded-medium border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          {t('admin.products.images.emptyWarning')}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {product.images.map((img) => (
            <li key={img.id} className="space-y-2 rounded-medium border border-divider/60 bg-content2 p-2">
              <div className="aspect-square overflow-hidden rounded-medium bg-default-100">
                <img src={img.url} alt={img.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <input
                defaultValue={img.alt ?? ''}
                placeholder={t('admin.products.images.altPlaceholder')}
                maxLength={180}
                onBlur={async (e) => {
                  const next = e.target.value.trim();
                  if ((next || null) === (img.alt ?? null) && img.displayOrder === img.displayOrder) return;
                  setError(null);
                  try {
                    await updateMutation.mutateAsync({
                      imageId: img.id,
                      body: { alt: next || null, displayOrder: img.displayOrder },
                    });
                  } catch (err) {
                    const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
                    setError(problem?.detail ?? problem?.title ?? t('admin.products.errors.unknown'));
                  }
                }}
                className="w-full rounded-medium border border-divider bg-background px-2 py-1 text-xs"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1 text-xs">
                  <span className="text-default-500">{t('admin.products.images.order')}</span>
                  <input
                    type="number"
                    defaultValue={img.displayOrder}
                    min={0}
                    max={999}
                    onBlur={async (e) => {
                      const next = Number.parseInt(e.target.value, 10) || 0;
                      if (next === img.displayOrder) return;
                      setError(null);
                      try {
                        await updateMutation.mutateAsync({
                          imageId: img.id,
                          body: { alt: img.alt, displayOrder: next },
                        });
                      } catch (err) {
                        const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
                        setError(problem?.detail ?? problem?.title ?? t('admin.products.errors.unknown'));
                      }
                    }}
                    className="w-12 rounded-medium border border-divider bg-background px-1 py-0.5 text-xs tabular-nums"
                  />
                </label>
                <Button
                  isIconOnly
                  variant="ghost"
                  size="md"
                  isDisabled={deleteMutation.isPending}
                  onPress={async () => {
                    setError(null);
                    try {
                      await deleteMutation.mutateAsync(img.id);
                    } catch (err) {
                      const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
                      setError(problem?.detail ?? problem?.title ?? t('admin.products.errors.unknown'));
                    }
                  }}
                  aria-label={t('admin.products.images.delete')}
                  className="text-default-500 hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
