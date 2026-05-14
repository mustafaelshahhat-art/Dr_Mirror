import { Button, Spinner } from '@heroui/react';
import { isAxiosError } from 'axios';
import { ArrowLeft, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import type { ProblemDetails } from '../../auth/types';
import type { ProductGender } from '../../catalog/types';

import {
  useAdminCategoriesQuery,
  useAdminProductQuery,
  useCreateVariantMutation,
  useDeleteImageMutation,
  useToggleVariantActiveMutation,
  useTogglePublishMutation,
  useUpdateImageMutation,
  useUpdateProductMutation,
  useUpdateVariantMutation,
  useUploadImageMutation,
} from './hooks';
import type { AdminProductDetailDto, AdminProductVariantDto } from './types';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Full product edit at <c>/admin/products/:id/edit</c>. Three sections:
 *   1. Master form — name / description / price / category / etc.
 *   2. Variants — inline-editable table.
 *   3. Images — thumbnail grid with file-picker upload and per-image alt text.
 */
export function AdminProductEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const query = useAdminProductQuery(id);

  if (query.isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Spinner aria-label={t('admin.products.edit.loading')} />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center text-sm text-default-500">
        {t('admin.products.edit.errorLoad')}
      </div>
    );
  }
  return <Inner product={query.data} />;
}

function Inner({ product }: { product: AdminProductDetailDto }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-default-500 hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('admin.products.edit.back')}
      </Link>

      <MasterForm product={product} />
      <VariantsSection product={product} />
      <ImagesSection product={product} />
    </section>
  );
}

// ----- Master form ------------------------------------------------------------

function MasterForm({ product }: { product: AdminProductDetailDto }) {
  const { t } = useTranslation();
  const categories = useAdminCategoriesQuery();
  const updateMutation = useUpdateProductMutation();
  const publishMutation = useTogglePublishMutation();

  const [nameAr, setNameAr] = useState(product.nameAr);
  const [nameEn, setNameEn] = useState(product.nameEn);
  const [descriptionAr, setDescriptionAr] = useState(product.descriptionAr);
  const [descriptionEn, setDescriptionEn] = useState(product.descriptionEn);
  const [price, setPrice] = useState(String(product.price));
  const [gender, setGender] = useState<ProductGender>(product.gender);
  const [material, setMaterial] = useState(product.material ?? '');
  const [brand, setBrand] = useState(product.brand ?? '');
  const [sku, setSku] = useState(product.sku ?? '');
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (savedAt === null) return;
    const id = window.setTimeout(() => setSavedAt(null), 1500);
    return () => window.clearTimeout(id);
  }, [savedAt]);

  return (
    <article className="rounded-large border border-divider/60 bg-content1 p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{product.nameEn}</h1>
          <p className="text-xs text-default-500" dir="ltr">
            /{product.slug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={[
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
              product.isPublished
                ? 'border-success/30 bg-success/15 text-success'
                : 'border-warning/30 bg-warning/15 text-warning',
            ].join(' ')}
          >
            {product.isPublished
              ? t('admin.products.list.published')
              : t('admin.products.list.draft')}
          </span>
          <Button
            type="button"
            variant={product.isPublished ? 'outline' : 'primary'}
            size="sm"
            isDisabled={publishMutation.isPending}
            onPress={async () => {
              setServerError(null);
              try {
                await publishMutation.mutateAsync({
                  id: product.id,
                  publish: !product.isPublished,
                });
              } catch (err) {
                const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
                setServerError(
                  problem?.detail ?? problem?.title ?? t('admin.products.errors.unknown'),
                );
              }
            }}
          >
            {product.isPublished
              ? t('admin.products.actions.unpublish')
              : t('admin.products.actions.publish')}
          </Button>
        </div>
      </header>

      {serverError ? (
        <div role="alert" className="mb-3 rounded-medium border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {serverError}
        </div>
      ) : null}
      {savedAt !== null ? (
        <div className="mb-3 rounded-medium border border-success/30 bg-success/10 p-3 text-sm text-success">
          {t('admin.products.edit.savedToast')}
        </div>
      ) : null}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setServerError(null);
          try {
            await updateMutation.mutateAsync({
              id: product.id,
              body: {
                nameAr: nameAr.trim(),
                nameEn: nameEn.trim(),
                descriptionAr: descriptionAr.trim(),
                descriptionEn: descriptionEn.trim(),
                price: Number.parseFloat(price) || 0,
                gender,
                material: material.trim() || null,
                brand: brand.trim() || null,
                sku: sku.trim() || null,
                categoryId,
              },
            });
            setSavedAt(Date.now());
          } catch (err) {
            const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
            setServerError(
              problem?.detail ?? problem?.title ?? t('admin.products.errors.unknown'),
            );
          }
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <SimpleField label={t('admin.products.fields.nameAr')} value={nameAr} onChange={setNameAr} required maxLength={200} />
        <SimpleField label={t('admin.products.fields.nameEn')} value={nameEn} onChange={setNameEn} required maxLength={200} />
        <SimpleTextarea label={t('admin.products.fields.descriptionAr')} value={descriptionAr} onChange={setDescriptionAr} required maxLength={4000} />
        <SimpleTextarea label={t('admin.products.fields.descriptionEn')} value={descriptionEn} onChange={setDescriptionEn} required maxLength={4000} />
        <SimpleField label={t('admin.products.fields.price')} value={price} onChange={setPrice} type="number" required />
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-default-500">
            {t('admin.products.fields.gender')}
          </span>
          <select
            value={gender}
            onChange={(e) => setGender(Number(e.target.value) as ProductGender)}
            className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm"
          >
            <option value={0}>{t('catalog.gender.men')}</option>
            <option value={1}>{t('catalog.gender.women')}</option>
            <option value={2}>{t('catalog.gender.unisex')}</option>
          </select>
        </label>
        <SimpleField label={t('admin.products.fields.material')} value={material} onChange={setMaterial} maxLength={200} />
        <SimpleField label={t('admin.products.fields.brand')} value={brand} onChange={setBrand} maxLength={80} />
        <SimpleField label={t('admin.products.fields.sku')} value={sku} onChange={setSku} maxLength={64} dir="ltr" />
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-default-500">
            {t('admin.products.fields.category')}
          </span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm"
          >
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn} — {c.nameAr}{c.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2 flex gap-2 pt-1">
          <Button type="submit" variant="primary" isDisabled={updateMutation.isPending}>
            {updateMutation.isPending
              ? t('admin.catalog.actions.saving')
              : t('admin.catalog.actions.save')}
          </Button>
        </div>
      </form>
    </article>
  );
}

// ----- Variants ---------------------------------------------------------------

function VariantsSection({ product }: { product: AdminProductDetailDto }) {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <article className="rounded-large border border-divider/60 bg-content1 p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-default-600">
          {t('admin.products.variants.heading')}
        </h2>
        {!showCreate ? (
          <Button variant="ghost" size="sm" onPress={() => setShowCreate(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" aria-hidden />
              {t('admin.products.variants.add')}
            </span>
          </Button>
        ) : null}
      </header>

      {showCreate ? (
        <VariantForm
          productId={product.id}
          mode="create"
          onDone={() => setShowCreate(false)}
        />
      ) : null}

      {product.variants.length === 0 && !showCreate ? (
        <p className="rounded-medium border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          {t('admin.products.variants.emptyWarning')}
        </p>
      ) : (
        <ul className="space-y-2">
          {product.variants.map((v) => (
            <li key={v.id}>
              {editingId === v.id ? (
                <VariantForm
                  productId={product.id}
                  mode="edit"
                  variant={v}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <VariantRow
                  productId={product.id}
                  variant={v}
                  onEdit={() => setEditingId(v.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function VariantRow({
  productId,
  variant,
  onEdit,
}: {
  productId: string;
  variant: AdminProductVariantDto;
  onEdit: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const toggleMutation = useToggleVariantActiveMutation(productId);
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className={[
        'flex items-center justify-between gap-3 rounded-medium border p-3',
        variant.isActive ? 'border-divider/60 bg-content1' : 'border-divider/40 bg-default-100/50 opacity-70',
      ].join(' ')}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="size-6 shrink-0 rounded-full ring-1 ring-default-200"
          style={{ backgroundColor: variant.colorHex }}
          aria-hidden
        />
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">
            {variant.size} / {isAr ? variant.colorNameAr : variant.colorName}
          </p>
          <p className="font-mono text-xs text-default-500" dir="ltr">
            {variant.sku}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm tabular-nums">
          {t('admin.products.variants.stock', { count: variant.stock })}
        </span>
        <Button isIconOnly variant="ghost" size="sm" onPress={onEdit} aria-label={t('admin.catalog.actions.edit')}>
          <Pencil className="size-4" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          isDisabled={toggleMutation.isPending}
          onPress={async () => {
            setError(null);
            try {
              await toggleMutation.mutateAsync({ variantId: variant.id, activate: !variant.isActive });
            } catch (err) {
              const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
              setError(problem?.detail ?? problem?.title ?? 'error');
            }
          }}
        >
          {variant.isActive
            ? t('admin.catalog.actions.deactivate')
            : t('admin.catalog.actions.activate')}
        </Button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function VariantForm({
  productId,
  mode,
  variant,
  onDone,
}: {
  productId: string;
  mode: 'create' | 'edit';
  variant?: AdminProductVariantDto;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const createMutation = useCreateVariantMutation(productId);
  const updateMutation = useUpdateVariantMutation(productId);
  const [size, setSize] = useState(variant?.size ?? '');
  const [colorName, setColorName] = useState(variant?.colorName ?? '');
  const [colorNameAr, setColorNameAr] = useState(variant?.colorNameAr ?? '');
  const [colorHex, setColorHex] = useState(variant?.colorHex ?? '#000000');
  const [sku, setSku] = useState(variant?.sku ?? '');
  const [stock, setStock] = useState(variant?.stock ?? 0);
  const [error, setError] = useState<string | null>(null);

  const inFlight = createMutation.isPending || updateMutation.isPending;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const body = {
          size: size.trim(),
          colorName: colorName.trim(),
          colorNameAr: colorNameAr.trim(),
          colorHex,
          sku: sku.trim(),
          stock,
        };
        try {
          if (mode === 'create') {
            await createMutation.mutateAsync(body);
          } else if (variant) {
            await updateMutation.mutateAsync({ variantId: variant.id, body });
          }
          onDone();
        } catch (err) {
          const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
          setError(problem?.detail ?? problem?.title ?? t('admin.products.errors.unknown'));
        }
      }}
      className="space-y-3 rounded-medium border border-primary/40 bg-primary/5 p-3"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_60px_1fr_100px]">
        <SimpleField label={t('admin.products.variants.size')} value={size} onChange={setSize} required maxLength={16} />
        <SimpleField label={t('admin.products.variants.colorName')} value={colorName} onChange={setColorName} required maxLength={60} />
        <SimpleField label={t('admin.products.variants.colorNameAr')} value={colorNameAr} onChange={setColorNameAr} required maxLength={60} />
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-default-500">{t('admin.products.variants.hex')}</span>
          <input
            type="color"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            className="h-9 w-full rounded-medium border border-divider bg-background"
          />
        </label>
        <SimpleField label={t('admin.products.variants.sku')} value={sku} onChange={setSku} required maxLength={64} dir="ltr" />
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-default-500">{t('admin.products.variants.stockLabel')}</span>
          <input
            type="number"
            min={0}
            max={1_000_000}
            value={stock}
            onChange={(e) => setStock(Number.parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm tabular-nums"
          />
        </label>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isDisabled={inFlight}>
          {inFlight
            ? t('admin.catalog.actions.saving')
            : mode === 'create'
              ? t('admin.catalog.actions.create')
              : t('admin.catalog.actions.save')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onPress={onDone} isDisabled={inFlight}>
          {t('admin.catalog.actions.cancel')}
        </Button>
      </div>
    </form>
  );
}

// ----- Images -----------------------------------------------------------------

function ImagesSection({ product }: { product: AdminProductDetailDto }) {
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
                  size="sm"
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

      {/* Keep these icon imports referenced even when no rendering branch hits them. */}
      <span className="hidden">
        <X aria-hidden />
      </span>
    </article>
  );
}

// ----- Shared field helpers ---------------------------------------------------

function SimpleField({
  label,
  value,
  onChange,
  type = 'text',
  required,
  maxLength,
  dir,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs uppercase tracking-wide text-default-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        maxLength={maxLength}
        dir={dir}
        className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm"
      />
    </label>
  );
}

function SimpleTextarea({
  label,
  value,
  onChange,
  required,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="space-y-1 text-sm sm:col-span-2">
      <span className="text-xs uppercase tracking-wide text-default-500">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        rows={3}
        className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm"
      />
    </label>
  );
}
