import { Button, Description, Input, Label, Spinner, TextArea, TextField } from '@heroui/react';
import { isAxiosError } from 'axios';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import type { ProblemDetails } from '../../auth/types';
import type { ProductGender } from '../../catalog/types';

import { useAdminCategoriesQuery, useCreateProductMutation } from './hooks';

import { SelectField } from '../../../shared/components/SelectField';

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
      <div className="flex min-h-[30vh] items-center justify-center">
        <Spinner aria-label={t('admin.products.create.loading')} />
      </div>
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

      <form
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
          <HeroField label={t('admin.products.fields.nameAr')} value={nameAr} onChange={setNameAr} required maxLength={200} />
          <HeroField label={t('admin.products.fields.nameEn')} value={nameEn} onChange={setNameEn} required maxLength={200} description={t('admin.products.fields.nameEnHint')} />
          <HeroTextarea label={t('admin.products.fields.descriptionAr')} value={descriptionAr} onChange={setDescriptionAr} required maxLength={4000} />
          <HeroTextarea label={t('admin.products.fields.descriptionEn')} value={descriptionEn} onChange={setDescriptionEn} required maxLength={4000} />
          <HeroField
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
          <HeroField label={t('admin.products.fields.material')} value={material} onChange={setMaterial} maxLength={200} />
          <HeroField label={t('admin.products.fields.brand')} value={brand} onChange={setBrand} maxLength={80} />
          <HeroField label={t('admin.products.fields.sku')} value={sku} onChange={setSku} maxLength={64} dir="ltr" />
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
          <Button type="submit" variant="primary" isDisabled={createMutation.isPending}>
            {createMutation.isPending
              ? t('admin.products.create.creating')
              : t('admin.products.create.submit')}
          </Button>
          <Link
            to="/admin/products"
            className="inline-flex items-center justify-center rounded-medium border border-divider/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-content2"
          >
            {t('admin.catalog.actions.cancel')}
          </Link>
        </div>
      </form>
    </section>
  );
}

function HeroField({
  label,
  value,
  onChange,
  type = 'text',
  required,
  maxLength,
  description,
  dir,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
  description?: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <TextField isRequired={required} className="flex flex-col gap-1">
      <Label className="text-xs uppercase tracking-wide text-default-500">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        type={type}
        maxLength={maxLength}
        dir={dir}
      />
      {description ? (
        <Description className="text-[11px] text-default-500">{description}</Description>
      ) : null}
    </TextField>
  );
}

function HeroTextarea({
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
    <TextField isRequired={required} className="flex flex-col gap-1 sm:col-span-2">
      <Label className="text-xs uppercase tracking-wide text-default-500">{label}</Label>
      <TextArea
        value={value}
        onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
        maxLength={maxLength}
        rows={3}
      />
    </TextField>
  );
}
