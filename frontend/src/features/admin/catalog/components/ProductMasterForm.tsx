import { Button, Form } from '@heroui/react';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../../../auth/types';
import type { ProductGender } from '../../../catalog/types';
import { Field, TextAreaField } from '../../../../shared/components/Field';
import { SelectField } from '../../../../shared/components/SelectField';
import {
  useAdminCategoriesQuery,
  useTogglePublishMutation,
  useUpdateProductMutation,
} from '../hooks';
import type { AdminProductDetailDto } from '../types';

export function ProductMasterForm({ product }: { product: AdminProductDetailDto }) {
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

      <Form
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
        <Field label={t('admin.products.fields.nameAr')} value={nameAr} onChange={setNameAr} required maxLength={200} />
        <Field label={t('admin.products.fields.nameEn')} value={nameEn} onChange={setNameEn} required maxLength={200} />
        <TextAreaField label={t('admin.products.fields.descriptionAr')} value={descriptionAr} onChange={setDescriptionAr} required maxLength={4000} />
        <TextAreaField label={t('admin.products.fields.descriptionEn')} value={descriptionEn} onChange={setDescriptionEn} required maxLength={4000} />
        <Field label={t('admin.products.fields.price')} value={price} onChange={setPrice} type="number" required />
        <SelectField
          label={t('admin.products.fields.gender')}
          value={String(gender)}
          onChange={(next) => setGender(Number(next) as ProductGender)}
          options={[
            { value: '0', label: t('catalog.gender.men') },
            { value: '1', label: t('catalog.gender.women') },
            { value: '2', label: t('catalog.gender.unisex') },
          ]}
        />
        <Field label={t('admin.products.fields.material')} value={material} onChange={setMaterial} maxLength={200} />
        <Field label={t('admin.products.fields.brand')} value={brand} onChange={setBrand} maxLength={80} />
        <Field label={t('admin.products.fields.sku')} value={sku} onChange={setSku} maxLength={64} dir="ltr" />
        <SelectField
          label={t('admin.products.fields.category')}
          value={categoryId}
          onChange={setCategoryId}
          isRequired
          options={(categories.data ?? []).map((c) => ({
            value: c.id,
            label: `${c.nameEn} (${c.nameAr})${c.isActive ? '' : ' (inactive)'}`,
          }))}
        />
        <div className="sm:col-span-2 flex gap-2 pt-1">
          <Button type="submit" variant="primary" isDisabled={updateMutation.isPending}>
            {updateMutation.isPending
              ? t('admin.catalog.actions.saving')
              : t('admin.catalog.actions.save')}
          </Button>
        </div>
      </Form>
    </article>
  );
}

