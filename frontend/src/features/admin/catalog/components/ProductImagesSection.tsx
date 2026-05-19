import { Button, Input, Label, Modal, NumberField, ProgressBar, Tooltip } from '@heroui/react';
import { Trash2, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
    } catch {
      // Toast emitted by mutation onError.
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
          {/* Exception 3 — rejected-primitive trail (per
              specs/003-heroui-migration/contracts/exceptions-register.md, criterion 5):
                - HeroUI `FileTrigger` / `FileInput`: considered and rejected — not
                  exported by @heroui/react v3.0.4.
                - React Aria `FileTrigger` direct usage: considered and rejected —
                  would violate FR-014.
              The visible affordance is the styled <label> wrapper above; the sr-only
              <input type="file"> only handles the OS file picker. */}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MIME.join(',')}
            className="sr-only"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </header>

      {uploadMutation.isPending ? (
        <ProgressBar
          isIndeterminate
          size="sm"
          aria-label={t('admin.products.images.uploading')}
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      ) : null}

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
              <Input
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
                  } catch {
                    // Toast emitted by mutation onError.
                  }
                }}
                variant="secondary"
                className="w-full text-xs"
              />
              <div className="flex items-center justify-between gap-2">
                <NumberField
                  defaultValue={img.displayOrder}
                  minValue={0}
                  maxValue={999}
                  step={1}
                  variant="secondary"
                  className="w-24 text-xs"
                  onBlur={async (e) => {
                    const input = e.currentTarget.querySelector('input');
                    const next = Number.parseInt(input?.value ?? '', 10) || 0;
                    if (next === img.displayOrder) return;
                    setError(null);
                    try {
                      await updateMutation.mutateAsync({
                        imageId: img.id,
                        body: { alt: img.alt, displayOrder: next },
                      });
                    } catch {
                      // Toast emitted by mutation onError.
                    }
                  }}
                >
                  <Label className="text-xs text-default-500">{t('admin.products.images.order')}</Label>
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input className="tabular-nums" />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                </NumberField>
                <Tooltip delay={300} closeDelay={0}>
                  <Button
                    isIconOnly
                    variant="ghost"
                    size="md"
                    isDisabled={deleteMutation.isPending}
                    onPress={() => setPendingDeleteId(img.id)}
                    aria-label={t('admin.products.images.delete')}
                    className="text-default-500 hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                  <Tooltip.Content placement="top">{t('admin.products.images.delete')}</Tooltip.Content>
                </Tooltip>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal>
        <Modal.Backdrop
          isOpen={pendingDeleteId !== null}
          onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        >
          <Modal.Container size="xs">
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.Header>
                    <Modal.Heading>{t('admin.products.images.delete')}</Modal.Heading>
                  </Modal.Header>
                  <Modal.Footer>
                    <Button variant="ghost" onPress={close}>
                      {t('admin.catalog.actions.cancel')}
                    </Button>
                    <Button
                      variant="danger"
                      isDisabled={deleteMutation.isPending}
                      onPress={async () => {
                        if (!pendingDeleteId) return;
                        setError(null);
                        try {
                          await deleteMutation.mutateAsync(pendingDeleteId);
                          close();
                        } catch {
                          // Toast emitted by mutation onError.
                          close();
                        }
                      }}
                    >
                      {t('admin.transition.confirm')}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </article>
  );
}
