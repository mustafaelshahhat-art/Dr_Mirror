import { Button, Form } from '@heroui/react';
import { isAxiosError } from 'axios';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import type { ProblemDetails } from '../../auth/types';
import type { ProductGender } from '../../catalog/types';

import { useAdminCategoriesQuery, useCreateProductMutation } from './hooks';

import { Field, TextAreaField } from '../../../shared/components/Field';
import { SelectField } from '../../../shared/components/SelectField';
import { LinkButton } from '../../../shared/components/LinkButton';
import { Skeleton } from '../../../shared/components/Skeleton';

export function AdminProductCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const categories = useAdminCategoriesQuery();
  const createMutation = useCreateProductMutation();

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [price, setPrice] = useState('0');
  const [gender, setGender] = useState<ProductGender>(2);
  const [material, setMaterial] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [serverError, setServerError] = useState<string | null>(null);

  if (categories.isLoading) {
    return (
      <section
        className="space-y-5"
        aria-busy="true"
        aria-label={t('admin.products.create.loading')}
      >
        <Skeleton className="h-4 w-32" />
        <header className="space-y-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </header>
        <div className="space-y-4 rounded-large border border-divider/60 bg-content1 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </section>
    );
  }

  const activeCategories = (categories.data ?? []).filter((c) => c.isActive);

  return (
    <section className="space-y-5">
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-default-500 hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('admin.products.create.back')}
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.products.create.title')}</h1>
        <p className="text-sm text-default-500">{t('admin.products.create.subtitle')}</p>
      </header>

      {serverError ? (
        <div role="alert" className="rounded-medium border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {serverError}
        </div>
      ) : null}

      <Form
        onSubmit={async (e) => {
          e.preventDefault();
          setServerError(null);
          try {
            const product = await createMutation.mutateAsync({
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
            });
            navigate(`/admin/products/${product.id}/edit`);
          } catch (err) {
            const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
            setServerError(
              problem?.detail ?? problem?.title ?? t('admin.products.errors.unknown'),
            );
          }
        }}
        className="space-y-4 rounded-large border border-divider/60 bg-content1 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('admin.products.fields.nameAr')} value={nameAr} onChange={setNameAr} required maxLength={200} />
          <Field label={t('admin.products.fields.nameEn')} value={nameEn} onChange={setNameEn} required maxLength={200} description={t('admin.products.fields.nameEnHint')} />
          <TextAreaField label={t('admin.products.fields.descriptionAr')} value={descriptionAr} onChange={setDescriptionAr} required maxLength={4000} />
          <TextAreaField label={t('admin.products.fields.descriptionEn')} value={descriptionEn} onChange={setDescriptionEn} required maxLength={4000} />
          <Field
            label={t('admin.products.fields.price')}
            value={price}
            onChange={setPrice}
            type="number"
            required
          />
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
            placeholder={t('admin.products.fields.pickCategory')}
            isRequired
            options={activeCategories.map((c) => ({
              value: c.id,
              label: `${c.nameEn} (${c.nameAr})`,
            }))}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" isPending={createMutation.isPending}>
            {createMutation.isPending
              ? t('admin.products.create.creating')
              : t('admin.products.create.submit')}
          </Button>
          <LinkButton
            to="/admin/products"
            tone="outline"
          >
            {t('admin.catalog.actions.cancel')}
          </LinkButton>
        </div>
      </Form>
    </section>
  );
}

