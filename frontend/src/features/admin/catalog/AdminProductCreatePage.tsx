import { Button, Form } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import type { ProductGender } from '../../catalog/types';

import { useAdminCategoriesQuery, useCreateProductMutation } from './hooks';

import { Field, TextAreaField } from '../../../shared/components/Field';
import { PageHeader } from '../../../shared/components/PageHeader';
import { SelectField } from '../../../shared/components/SelectField';
import { Skeleton } from '../../../shared/components/Skeleton';

const productCreateSchema = z.object({
  nameAr: z.string().trim().min(1, 'nameArRequired').max(120, 'nameArTooLong'),
  nameEn: z.string().trim().min(1, 'nameEnRequired').max(120, 'nameEnTooLong'),
  descriptionAr: z.string().trim().max(2000, 'descriptionArTooLong'),
  descriptionEn: z.string().trim().max(2000, 'descriptionEnTooLong'),
  price: z.string().trim().refine((value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0;
  }, 'pricePositive'),
  gender: z.union([z.literal('0'), z.literal('1'), z.literal('2')]),
  material: z.string().trim().max(100, 'materialTooLong'),
  sku: z.string().trim().max(50, 'skuTooLong'),
  categoryId: z.string().uuid('categoryRequired'),
});

type ProductCreateFormValues = z.infer<typeof productCreateSchema>;

export function AdminProductCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const categories = useAdminCategoriesQuery();
  const createMutation = useCreateProductMutation();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductCreateFormValues>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: {
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      price: '0',
      gender: '2',
      material: '',
      sku: '',
      categoryId: '',
    },
  });

  if (categories.isLoading) {
    return (
      <section
        className="space-y-8"
        aria-busy="true"
        aria-label={t('admin.products.create.loading')}
      >
        <Skeleton className="h-4 w-32" />
        <header className="space-y-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </header>
        <div className="content-surface space-y-4 p-4">
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
  const pending = createMutation.isPending || isSubmitting;
  const error = (message?: string) => (message ? t(`admin.products.validation.${message}`) : null);

  return (
    <section className="space-y-8">
      <Link to="/admin/products" className="back-link">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('admin.products.create.back')}
      </Link>

      <PageHeader title={t('admin.products.create.title')} subtitle={t('admin.products.create.subtitle')} />

      <Form
        onSubmit={handleSubmit(async (values) => {
          try {
            const product = await createMutation.mutateAsync({
              nameAr: values.nameAr.trim(),
              nameEn: values.nameEn.trim(),
              descriptionAr: values.descriptionAr.trim(),
              descriptionEn: values.descriptionEn.trim(),
              price: Number.parseFloat(values.price),
              gender: Number(values.gender) as ProductGender,
              material: values.material.trim() || null,
              sku: values.sku.trim() || null,
              categoryId: values.categoryId,
            });
            navigate(`/admin/products/${product.id}/edit`);
          } catch {
            // Toast emitted by mutation onError.
          }
        })}
        className="content-surface space-y-4 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Controller name="nameAr" control={control} render={({ field }) => (
            <Field {...field} label={t('admin.products.fields.nameAr')} maxLength={120} errorMessage={error(errors.nameAr?.message)} />
          )} />
          <Controller name="nameEn" control={control} render={({ field }) => (
            <Field {...field} label={t('admin.products.fields.nameEn')} maxLength={120} description={t('admin.products.fields.nameEnHint')} errorMessage={error(errors.nameEn?.message)} />
          )} />
          <Controller name="descriptionAr" control={control} render={({ field }) => (
            <TextAreaField {...field} label={t('admin.products.fields.descriptionAr')} maxLength={2000} errorMessage={error(errors.descriptionAr?.message)} />
          )} />
          <Controller name="descriptionEn" control={control} render={({ field }) => (
            <TextAreaField {...field} label={t('admin.products.fields.descriptionEn')} maxLength={2000} errorMessage={error(errors.descriptionEn?.message)} />
          )} />
          <Controller name="price" control={control} render={({ field }) => (
            <Field {...field} label={t('admin.products.fields.price')} type="number" errorMessage={error(errors.price?.message)} />
          )} />
          <Controller name="gender" control={control} render={({ field }) => (
            <SelectField
              label={t('admin.products.fields.gender')}
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: '0', label: t('catalog.gender.men') },
                { value: '1', label: t('catalog.gender.women') },
                { value: '2', label: t('catalog.gender.unisex') },
              ]}
            />
          )} />
          <Controller name="material" control={control} render={({ field }) => (
            <Field {...field} label={t('admin.products.fields.material')} maxLength={100} errorMessage={error(errors.material?.message)} />
          )} />
          <Controller name="sku" control={control} render={({ field }) => (
            <Field {...field} label={t('admin.products.fields.sku')} maxLength={50} dir="ltr" errorMessage={error(errors.sku?.message)} />
          )} />
          <Controller name="categoryId" control={control} render={({ field }) => (
            <SelectField
              label={t('admin.products.fields.category')}
              value={field.value}
              onChange={field.onChange}
              placeholder={t('admin.products.fields.pickCategory')}
              errorMessage={error(errors.categoryId?.message)}
              options={activeCategories.map((c) => ({
                value: c.id,
                label: `${c.nameEn} (${c.nameAr})`,
              }))}
            />
          )} />
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" isPending={pending} isDisabled={pending}>
            {pending
              ? t('admin.products.create.creating')
              : t('admin.products.create.submit')}
          </Button>
          <Link
            to="/admin/products"
            className={buttonVariants({ variant: 'outline' })}
          >
            {t('admin.catalog.actions.cancel')}
          </Link>
        </div>
      </Form>
    </section>
  );
}

