import { AlertDialog, Button, FieldError, Form, Heading, Label, NumberField, toast, useOverlayState } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import type { ProductGender } from '../../../catalog/types';
import { Field, TextAreaField } from '../../../../shared/components/Field';
import { SelectField } from '../../../../shared/components/SelectField';
import {
  useAdminCategoriesQuery,
  useTogglePublishMutation,
  useUpdateProductMutation,
} from '../hooks';
import type { AdminProductDetailDto } from '../types';

const productMasterSchema = z.object({
  nameAr: z.string().trim().min(1, 'admin.products.validation.nameArRequired').max(120, 'admin.products.validation.nameArTooLong'),
  nameEn: z.string().trim().min(1, 'admin.products.validation.nameEnRequired').max(120, 'admin.products.validation.nameEnTooLong'),
  descriptionAr: z.string().trim().max(2000, 'admin.products.validation.descriptionArTooLong'),
  descriptionEn: z.string().trim().max(2000, 'admin.products.validation.descriptionEnTooLong'),
  price: z.number().positive('admin.products.validation.pricePositive'),
  gender: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  material: z.string().trim().max(100, 'admin.products.validation.materialTooLong'),
  brand: z.string().trim().max(100, 'admin.products.validation.brandTooLong'),
  sku: z.string().trim().max(50, 'admin.products.validation.skuTooLong'),
  categoryId: z.string().uuid('admin.products.validation.categoryRequired'),
});

type ProductMasterFormValues = z.infer<typeof productMasterSchema>;

export function ProductMasterForm({
  product,
  hideTitle = false,
}: {
  product: AdminProductDetailDto;
  hideTitle?: boolean;
}) {
  const { t } = useTranslation();
  const categories = useAdminCategoriesQuery();
  const updateMutation = useUpdateProductMutation();
  const publishMutation = useTogglePublishMutation();
  const unpublishState = useOverlayState({ defaultOpen: false });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductMasterFormValues>({
    resolver: zodResolver(productMasterSchema),
    defaultValues: {
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      descriptionAr: product.descriptionAr,
      descriptionEn: product.descriptionEn,
      price: product.price,
      gender: product.gender,
      material: product.material ?? '',
      brand: product.brand ?? '',
      sku: product.sku ?? '',
      categoryId: product.categoryId,
    },
  });
  const error = (message?: string) => (message ? t(message) : null);

  return (
    <article className="content-surface p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {hideTitle ? <span aria-hidden /> : (
          <div>
            <Heading className="text-xl font-semibold tracking-tight">{product.nameEn}</Heading>
            <p className="text-xs text-default-500" dir="ltr">
              /{product.slug}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span
            className={[
              'inline-flex items-center rounded-medium border px-2 py-0.5 text-xs font-medium leading-none',
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
            onPress={product.isPublished
              ? unpublishState.open
              : async () => {
                  try {
                    await publishMutation.mutateAsync({ id: product.id, publish: true });
                  } catch {
                    // Toast emitted by mutation onError.
                  }
                }
            }
          >
            {product.isPublished
              ? t('admin.products.actions.unpublish')
              : t('admin.products.actions.publish')}
          </Button>
        </div>
      </header>

      <Form
        onSubmit={handleSubmit(async (values) => {
          try {
            await updateMutation.mutateAsync({
              id: product.id,
              body: {
                nameAr: values.nameAr.trim(),
                nameEn: values.nameEn.trim(),
                descriptionAr: values.descriptionAr.trim(),
                descriptionEn: values.descriptionEn.trim(),
                price: values.price,
                gender: values.gender as ProductGender,
                material: values.material.trim() || null,
                brand: values.brand.trim() || null,
                sku: values.sku.trim() || null,
                categoryId: values.categoryId,
              },
            });
            toast.success(t('admin.products.edit.savedToast'));
          } catch {
            // Toast emitted by mutation onError.
          }
        })}
        className="grid gap-3 sm:grid-cols-2"
      >
        <Controller name="nameAr" control={control} render={({ field }) => (
          <Field {...field} label={t('admin.products.fields.nameAr')} required maxLength={120} errorMessage={error(errors.nameAr?.message)} />
        )} />
        <Controller name="nameEn" control={control} render={({ field }) => (
          <Field {...field} label={t('admin.products.fields.nameEn')} required maxLength={120} errorMessage={error(errors.nameEn?.message)} />
        )} />
        <Controller name="descriptionAr" control={control} render={({ field }) => (
          <TextAreaField {...field} label={t('admin.products.fields.descriptionAr')} maxLength={2000} errorMessage={error(errors.descriptionAr?.message)} />
        )} />
        <Controller name="descriptionEn" control={control} render={({ field }) => (
          <TextAreaField {...field} label={t('admin.products.fields.descriptionEn')} maxLength={2000} errorMessage={error(errors.descriptionEn?.message)} />
        )} />
        <Controller name="price" control={control} render={({ field }) => (
          <NumberField
            value={field.value}
            minValue={0}
            onChange={(next) => field.onChange(next ?? 0)}
            isRequired
            isInvalid={Boolean(errors.price)}
            variant="secondary"
            className="text-sm"
          >
            <Label className="text-xs uppercase tracking-wide text-default-500">{t('admin.products.fields.price')}</Label>
            <NumberField.Group>
              <NumberField.Input className="tabular-nums" />
            </NumberField.Group>
            {errors.price?.message ? <FieldError className="text-xs text-danger">{error(errors.price.message)}</FieldError> : null}
          </NumberField>
        )} />
        <Controller name="gender" control={control} render={({ field }) => (
          <SelectField
            label={t('admin.products.fields.gender')}
            value={String(field.value)}
            onChange={(next) => field.onChange(Number(next) as ProductGender)}
            isRequired
            errorMessage={error(errors.gender?.message)}
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
        <Controller name="brand" control={control} render={({ field }) => (
          <Field {...field} label={t('admin.products.fields.brand')} maxLength={100} errorMessage={error(errors.brand?.message)} />
        )} />
        <Controller name="sku" control={control} render={({ field }) => (
          <Field {...field} label={t('admin.products.fields.sku')} maxLength={50} dir="ltr" errorMessage={error(errors.sku?.message)} />
        )} />
        <Controller name="categoryId" control={control} render={({ field }) => (
          <SelectField
            label={t('admin.products.fields.category')}
            value={field.value}
            onChange={field.onChange}
            isRequired
            errorMessage={error(errors.categoryId?.message)}
            options={(categories.data ?? []).map((c) => ({
              value: c.id,
              label: `${c.nameEn} (${c.nameAr})${c.isActive ? '' : ` (${t('admin.catalog.status.inactive')})`}`,
            }))}
          />
        )} />
        <div className="sm:col-span-2 flex gap-2 pt-1">
          <Button type="submit" variant="primary" isPending={updateMutation.isPending}>
            {updateMutation.isPending
              ? t('admin.catalog.actions.saving')
              : t('admin.catalog.actions.save')}
          </Button>
        </div>
      </Form>
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={unpublishState.isOpen}
          isDismissable={false}
          onOpenChange={unpublishState.setOpen}
        >
          <AlertDialog.Container size="xs">
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>{t('admin.products.actions.unpublish')}</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <Button variant="ghost" onPress={close}>
                      {t('admin.catalog.actions.cancel')}
                    </Button>
                    <Button
                      variant="danger"
                      isDisabled={publishMutation.isPending}
                      onPress={async () => {
                        try {
                          await publishMutation.mutateAsync({ id: product.id, publish: false });
                          close();
                        } catch {
                          // Toast emitted by mutation onError.
                          close();
                        }
                      }}
                    >
                      {t('admin.transition.confirm')}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </article>
  );
}

