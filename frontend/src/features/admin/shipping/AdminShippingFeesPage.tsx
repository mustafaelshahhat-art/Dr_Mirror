import { Button, FieldError, Form, Label, NumberField, Switch, toast } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { PackageOpen, Truck } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { PageHeader } from '../../../shared/components/PageHeader';
import { QueryErrorState } from '../../../shared/components/QueryErrorState';
import { Skeleton } from '../../../shared/components/Skeleton';
import { StatusPill } from '../../../shared/components/StatusPill';
import { formatCurrency, formatDate } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';

import {
  useAdminGovernorateShippingFeesQuery,
  useUpdateGovernorateShippingFeeMutation,
} from './hooks';
import type { AdminGovernorateShippingFeeDto } from './types';

const shippingFeeSchema = z.object({
  fee: z.number().min(0, 'shipping.validation.feeNonNegative'),
  isActive: z.boolean(),
});

type ShippingFeeFormValues = z.infer<typeof shippingFeeSchema>;

export function AdminShippingFeesPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const query = useAdminGovernorateShippingFeesQuery();
  const updateMutation = useUpdateGovernorateShippingFeeMutation();

  if (query.isLoading) {
    return (
      <section className="space-y-8" aria-busy="true" aria-label={t('shipping.admin.loading')}>
        <PageHeader title={t('shipping.admin.title')} subtitle={t('shipping.admin.description')} />
        <ul className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="content-surface flex items-center justify-between gap-4 p-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-9 w-40" />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="space-y-8">
        <PageHeader title={t('shipping.admin.title')} subtitle={t('shipping.admin.description')} />
        <QueryErrorState
          message={t('shipping.admin.errorLoad')}
          retryLabel={t('admin.query.retry')}
          onRetry={() => void query.refetch()}
        error={query.error}
        />
      </section>
    );
  }

  const governorates = query.data ?? [];

  return (
    <section className="space-y-8">
      <PageHeader title={t('shipping.admin.title')} subtitle={t('shipping.admin.description')} />

      {governorates.length === 0 ? (
        <div className="content-surface p-10 text-center">
          <PackageOpen className="enter-fade-up mx-auto mb-3 size-6 text-default-400" aria-hidden />
          <p className="enter-fade-up text-sm text-default-500">{t('shipping.admin.empty')}</p>
        </div>
      ) : (
        <ul className="space-y-2" aria-busy={query.isFetching || updateMutation.isPending}>
          {governorates.map((governorate) => (
            <li key={governorate.id}>
              <ShippingFeeRow
                governorate={governorate}
                lang={lang}
                isPending={updateMutation.isPending}
                onSubmit={async (body) => {
                  const updated = await updateMutation.mutateAsync({ id: governorate.id, body });
                  toast.success(t('shipping.admin.saved'));
                  return updated;
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ShippingFeeRow({
  governorate,
  lang,
  isPending,
  onSubmit,
}: {
  governorate: AdminGovernorateShippingFeeDto;
  lang: AppLang;
  isPending: boolean;
  onSubmit: (body: ShippingFeeFormValues) => Promise<AdminGovernorateShippingFeeDto>;
}) {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ShippingFeeFormValues>({
    resolver: zodResolver(shippingFeeSchema),
    defaultValues: {
      fee: governorate.fee,
      isActive: governorate.isActive,
    },
  });

  useEffect(() => {
    reset({ fee: governorate.fee, isActive: governorate.isActive });
  }, [governorate.fee, governorate.isActive, reset]);

  const pending = isPending || isSubmitting;
  const name = lang === 'ar' ? governorate.nameAr : governorate.nameEn;
  const secondaryName = lang === 'ar' ? governorate.nameEn : governorate.nameAr;
  const error = (message?: string) => (message ? t(message) : null);

  return (
    <Form
      onSubmit={handleSubmit(async (values) => {
        try {
          const updated = await onSubmit(values);
          reset({ fee: updated.fee, isActive: updated.isActive });
        } catch {
          // Toast emitted by mutation onError.
        }
      })}
      className="content-surface gap-4 p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_180px_160px_auto] sm:items-end"
    >
      <div className="min-w-0 space-y-1 sm:self-center">
        <div className="flex flex-wrap items-center gap-2">
          <Truck className="size-4 shrink-0 text-default-400" aria-hidden />
          <p className="font-semibold text-foreground">{name}</p>
          <StatusPill
            active={governorate.isActive}
            activeLabel={t('shipping.admin.active')}
            inactiveLabel={t('shipping.admin.inactive')}
          />
        </div>
        <p className="text-xs text-default-500">{secondaryName}</p>
        <p className="text-xs text-default-500">
          {t('shipping.admin.updatedAtValue', { value: formatDate(governorate.updatedAt, lang, 'YYYY-MM-DD HH:mm') })}
        </p>
      </div>

      <Controller name="fee" control={control} render={({ field }) => (
        <NumberField
          value={field.value}
          minValue={0}
          onChange={(next) => field.onChange(next ?? 0)}
          isRequired
          isInvalid={Boolean(errors.fee)}
          variant="secondary"
          className="text-sm"
        >
          <Label className="text-sm uppercase tracking-wide text-default-600 font-medium">
            {t('shipping.fee.label')}
          </Label>
          <NumberField.Group className="grid-cols-[1fr]">
            <NumberField.Input className="tabular-nums" />
          </NumberField.Group>
          <p className="text-xs text-default-500">
            {formatCurrency(field.value || 0, lang)}
          </p>
          {errors.fee?.message ? (
            <FieldError className="text-xs text-danger">{error(errors.fee.message)}</FieldError>
          ) : null}
        </NumberField>
      )} />

      <div className="flex items-center gap-2 sm:pb-2">
        <Controller name="isActive" control={control} render={({ field }) => (
          <Switch
            isSelected={field.value}
            isDisabled={pending}
            onChange={field.onChange}
            aria-label={t('shipping.admin.active')}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
        )} />
        <span className="text-sm text-default-700 dark:text-default-300">{t('shipping.admin.active')}</span>
      </div>

      <Button type="submit" variant="primary" isPending={pending} isDisabled={pending || !isDirty}>
        {pending ? t('shipping.admin.saving') : t('shipping.admin.save')}
      </Button>
    </Form>
  );
}
