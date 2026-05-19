import { Button, FieldError, Form, Input, Label, NumberField, TextField, Tooltip } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  useCreateVariantMutation,
  useToggleVariantActiveMutation,
  useUpdateVariantMutation,
} from '../hooks';
import type { AdminProductDetailDto, AdminProductVariantDto } from '../types';

import { Field as SimpleField } from '../../../../shared/components/Field';

const variantFormSchema = z.object({
  size: z.string().trim().min(1, 'admin.products.variants.validation.sizeRequired').max(20, 'admin.products.variants.validation.sizeTooLong'),
  colorName: z.string().trim().min(1, 'admin.products.variants.validation.colorNameRequired').max(50, 'admin.products.variants.validation.colorNameTooLong'),
  colorNameAr: z.string().trim().min(1, 'admin.products.variants.validation.colorNameArRequired').max(50, 'admin.products.variants.validation.colorNameArTooLong'),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'admin.products.variants.validation.colorHexInvalid'),
  sku: z.string().trim().max(50, 'admin.products.variants.validation.skuTooLong'),
  stock: z.number().int('admin.products.variants.validation.stockInteger').nonnegative('admin.products.variants.validation.stockNonNegative'),
});

type VariantFormValues = z.infer<typeof variantFormSchema>;

export function ProductVariantsSection({ product }: { product: AdminProductDetailDto }) {
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
        // eslint-disable-next-line i18next/no-literal-string -- programmatic form mode, not user copy
        <VariantForm productId={product.id} mode="create"
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
                // eslint-disable-next-line i18next/no-literal-string -- programmatic form mode, not user copy
                <VariantForm productId={product.id} mode="edit"
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
        <Tooltip>
          <Button isIconOnly variant="ghost" size="md" onPress={onEdit} aria-label={t('admin.catalog.actions.edit')}>
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Tooltip.Content placement="top">{t('admin.catalog.actions.edit')}</Tooltip.Content>
        </Tooltip>
        <Button
          variant="ghost"
          size="sm"
          isDisabled={toggleMutation.isPending}
          onPress={async () => {
            try {
              await toggleMutation.mutateAsync({ variantId: variant.id, activate: !variant.isActive });
            } catch {
              // Toast emitted by mutation onError.
            }
          }}
        >
          {variant.isActive
            ? t('admin.catalog.actions.deactivate')
            : t('admin.catalog.actions.activate')}
        </Button>
      </div>
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
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: {
      size: variant?.size ?? '',
      colorName: variant?.colorName ?? '',
      colorNameAr: variant?.colorNameAr ?? '',
      colorHex: variant?.colorHex ?? '#000000',
      sku: variant?.sku ?? '',
      stock: variant?.stock ?? 0,
    },
  });

  const inFlight = createMutation.isPending || updateMutation.isPending;
  const error = (message?: string) => (message ? t(message) : null);

  return (
    <Form
      onSubmit={handleSubmit(async (values) => {
        const body = {
          size: values.size.trim(),
          colorName: values.colorName.trim(),
          colorNameAr: values.colorNameAr.trim(),
          colorHex: values.colorHex,
          sku: values.sku.trim(),
          stock: values.stock,
        };
        try {
          if (mode === 'create') {
            await createMutation.mutateAsync(body);
          } else if (variant) {
            await updateMutation.mutateAsync({ variantId: variant.id, body });
          }
          onDone();
        } catch {
          // Toast emitted by mutation onError.
        }
      })}
      className="space-y-3 rounded-medium border border-primary/40 bg-primary/5 p-3"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_60px_1fr_100px]">
        <Controller name="size" control={control} render={({ field }) => (
          <SimpleField {...field} label={t('admin.products.variants.size')} required maxLength={20} errorMessage={error(errors.size?.message)} />
        )} />
        <Controller name="colorName" control={control} render={({ field }) => (
          <SimpleField {...field} label={t('admin.products.variants.colorName')} required maxLength={50} errorMessage={error(errors.colorName?.message)} />
        )} />
        <Controller name="colorNameAr" control={control} render={({ field }) => (
          <SimpleField {...field} label={t('admin.products.variants.colorNameAr')} required maxLength={50} errorMessage={error(errors.colorNameAr?.message)} />
        )} />
        {/* HeroUI TextField + Input type="color" per Anatomy A.16.
            The native OS color-picker UX is preserved via Input type="color";
            the HeroUI TextField wraps it with Label + FieldError so the field
            participates in the form's accessible label/error chain.
            Rejected alternatives: ColorField (hex text input — worse admin UX
            than the OS picker; requires Color-object ↔ string conversion);
            ColorPicker (HSV popover — disproportionate complexity for this
            simple hex-code field). */}
        <Controller name="colorHex" control={control} render={({ field }) => (
          <TextField
            value={field.value}
            onChange={field.onChange}
            isRequired
            isInvalid={Boolean(errors.colorHex)}
            className="space-y-1 text-sm"
          >
            <Label className="text-xs uppercase tracking-wide text-default-500">
              {t('admin.products.variants.hex')}
            </Label>
            <Input
              type="color"
              dir="ltr"
              className="h-9 w-full cursor-pointer rounded-medium border border-divider bg-background p-1"
            />
            {errors.colorHex?.message ? (
              <FieldError className="text-xs text-danger">{error(errors.colorHex.message)}</FieldError>
            ) : null}
          </TextField>
        )} />
        <Controller name="sku" control={control} render={({ field }) => (
          <SimpleField {...field} label={t('admin.products.variants.sku')} maxLength={50} dir="ltr" errorMessage={error(errors.sku?.message)} />
        )} />
        <Controller name="stock" control={control} render={({ field }) => (
          <NumberField
            value={field.value}
            minValue={0}
            maxValue={1_000_000}
            step={1}
            onChange={(next) => field.onChange(next ?? 0)}
            isInvalid={Boolean(errors.stock)}
            variant="secondary"
            className="text-sm"
          >
            <Label className="text-xs uppercase tracking-wide text-default-500">{t('admin.products.variants.stockLabel')}</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input className="tabular-nums" />
              <NumberField.IncrementButton />
            </NumberField.Group>
            {errors.stock?.message ? <FieldError className="text-xs text-danger">{error(errors.stock.message)}</FieldError> : null}
          </NumberField>
        )} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isPending={inFlight}>
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
    </Form>
  );
}
