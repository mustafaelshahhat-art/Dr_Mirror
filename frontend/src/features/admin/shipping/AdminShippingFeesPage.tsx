/* eslint-disable jsx-a11y/no-redundant-roles --
   FR-025 requires explicit role="list" / role="listitem" on the mobile card
   layouts: Safari + VoiceOver strip the implicit list role when CSS sets
   list-style: none (the default for Tailwind utility classes). */
/* eslint-disable i18next/no-literal-string -- Allow format strings and styling strings */

import { Button, FieldError, Form, Label, NumberField, Switch, toast } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, PackageOpen, Truck, XCircle } from 'lucide-react';
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
        
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="content-surface flex items-center gap-4 p-4 border border-divider/60">
              <Skeleton className="size-12 rounded-full shrink-0" />
              <div className="space-y-2 w-full">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* List Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-0 lg:border lg:border-divider/60 lg:rounded-large lg:overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="content-surface border border-divider/60 rounded-large flex flex-col gap-4 p-4 lg:grid lg:grid-cols-[1.5fr_1.25fr_1.25fr_1.25fr_1fr_auto] lg:gap-4 lg:p-4 lg:rounded-none lg:border-0 lg:border-b lg:border-divider/30 lg:bg-transparent"
            >
              {/* Col 1: Name */}
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-8 rounded-medium shrink-0" />
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              
              {/* Col 2: Arabic Name */}
              <div className="hidden lg:block">
                <Skeleton className="h-4 w-20" />
              </div>

              {/* Col 3: Input */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-12 lg:hidden" />
                <Skeleton className="h-9 w-full" />
              </div>

              {/* Col 4: Status */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-10 shrink-0" />
                <Skeleton className="h-4 w-12" />
              </div>

              {/* Col 5: Last Updated */}
              <div className="hidden lg:block">
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Col 6: Action Button */}
              <Skeleton className="h-9 w-full lg:w-28" />
            </div>
          ))}
        </div>
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
  const totalGovs = governorates.length;
  const activeGovs = governorates.filter((g) => g.isActive).length;
  const inactiveGovs = governorates.filter((g) => !g.isActive).length;

  return (
    <section className="space-y-8">
      <PageHeader title={t('shipping.admin.title')} subtitle={t('shipping.admin.description')} />

      {governorates.length === 0 ? (
        <div className="content-surface p-10 text-center">
          <PackageOpen className="enter-fade-up mx-auto mb-3 size-6 text-default-400" aria-hidden />
          <p className="enter-fade-up text-sm text-default-500">{t('shipping.admin.empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="region" aria-label={t('shipping.admin.stats.total')}>
            <div className="content-surface flex items-center gap-4 p-4 border border-divider/60">
              <div className="p-3 rounded-full bg-primary/10 text-primary shrink-0">
                <Truck className="size-6" aria-hidden />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs text-default-500 font-medium truncate">{t('shipping.admin.stats.total')}</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{totalGovs}</p>
              </div>
            </div>
            <div className="content-surface flex items-center gap-4 p-4 border border-divider/60">
              <div className="p-3 rounded-full bg-success/10 text-success shrink-0">
                <CheckCircle className="size-6" aria-hidden />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs text-default-500 font-medium truncate">{t('shipping.admin.stats.active')}</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{activeGovs}</p>
              </div>
            </div>
            <div className="content-surface flex items-center gap-4 p-4 border border-divider/60">
              <div className="p-3 rounded-full bg-danger/10 text-danger shrink-0">
                <XCircle className="size-6" aria-hidden />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs text-default-500 font-medium truncate">{t('shipping.admin.stats.inactive')}</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{inactiveGovs}</p>
              </div>
            </div>
          </div>

          {/* Desktop Table Headers */}
          <div className="hidden lg:grid lg:grid-cols-[1.5fr_1.25fr_1.25fr_1.25fr_1fr_auto] gap-4 px-4 py-3 bg-default-100 dark:bg-default-50/50 rounded-medium font-semibold text-xs text-default-500 uppercase tracking-wider items-center border border-divider/60 mb-2">
            <div>{t('shipping.admin.headers.governorate')}</div>
            <div>{t('shipping.admin.headers.arabicName')}</div>
            <div>{t('shipping.admin.headers.shippingFee')}</div>
            <div>{t('shipping.admin.headers.status')}</div>
            <div>{t('shipping.admin.headers.lastUpdated')}</div>
            <div className="text-center">{t('shipping.admin.headers.actions')}</div>
          </div>

          {/* Governorates List: Mobile (1col grid) -> Tablet (2col grid) -> Desktop (1col full border-divided list) */}
          <ul
            role="list"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-0 lg:divide-y lg:divide-divider/60 lg:border lg:border-divider/60 lg:rounded-large lg:overflow-hidden lg:bg-content1"
            aria-busy={query.isFetching || updateMutation.isPending}
          >
            {governorates.map((governorate) => (
              <li key={governorate.id} role="listitem" className="w-full">
                <ShippingFeeRow
                  governorate={governorate}
                  lang={lang}
                  isPending={updateMutation.isPending && updateMutation.variables?.id === governorate.id}
                  onSubmit={async (body) => {
                    const updated = await updateMutation.mutateAsync({ id: governorate.id, body });
                    toast.success(t('shipping.admin.saved'));
                    return updated;
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
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
      className="content-surface border border-divider/60 rounded-large flex flex-col gap-3 p-4 lg:grid lg:grid-cols-[1.5fr_1.25fr_1.25fr_1.25fr_1fr_auto] lg:gap-4 lg:p-3 lg:items-center lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-b lg:border-divider/30 lg:bg-transparent lg:hover:bg-default-50/30 transition-colors"
    >
      {/* COLUMN 1: GOVERNORATE (Mobile: Name + StatusPill, Desktop: Icon + Name + Alternative underneath) */}
      <div className="min-w-0 flex flex-col lg:flex-row lg:items-center gap-2">
        {/* Mobile/Tablet Header layout */}
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <div className="flex items-center gap-2">
            <Truck className="size-4 shrink-0 text-primary" aria-hidden />
            <p className="font-semibold text-foreground truncate">{name}</p>
          </div>
          <StatusPill
            active={governorate.isActive}
            activeLabel={t('shipping.admin.active')}
            inactiveLabel={t('shipping.admin.inactive')}
          />
        </div>
        
        {/* Desktop-only name layout */}
        <div className="hidden lg:flex items-center gap-2.5">
          <div className="p-1.5 rounded-medium bg-default-100 text-default-500 dark:bg-default-800">
            <Truck className="size-4 shrink-0" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{name}</p>
            <p className="text-xs text-default-400 truncate">{secondaryName}</p>
          </div>
        </div>
      </div>

      {/* COLUMN 2: ARABIC NAME (Desktop only) */}
      <div className="hidden lg:block min-w-0">
        <p className="text-sm font-medium text-foreground truncate select-all" dir="rtl">
          {governorate.nameAr}
        </p>
      </div>

      {/* COLUMN 3: SHIPPING FEE (Responsive) */}
      <div className="min-w-0">
        <Controller
          name="fee"
          control={control}
          render={({ field }) => (
            <NumberField
              value={field.value}
              minValue={0}
              onChange={(next) => field.onChange(next ?? 0)}
              isRequired
              isInvalid={Boolean(errors.fee)}
              variant="secondary"
              className="text-sm w-full"
            >
              <Label className="text-xs uppercase tracking-wide text-default-600 font-medium mb-1 block lg:hidden">
                {t('shipping.fee.label')}
              </Label>
              <NumberField.Group className="grid-cols-[1fr] relative">
                <NumberField.Input className="tabular-nums px-3 py-1.5 bg-default-50 hover:bg-default-100 focus:bg-background border border-divider/80 focus:border-primary rounded-medium transition-colors w-full text-start" />
              </NumberField.Group>
              <p className="text-xs text-default-500 mt-1 select-none tabular-nums text-start">
                {formatCurrency(field.value || 0, lang)}
              </p>
              {errors.fee?.message ? (
                <FieldError className="text-xs text-danger mt-1 text-start">{error(errors.fee.message)}</FieldError>
              ) : null}
            </NumberField>
          )}
        />
      </div>

      {/* COLUMN 4: AVAILABILITY STATUS (Responsive) */}
      <div className="flex items-center gap-3 justify-between lg:justify-start">
        <div className="flex items-center gap-2">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
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
            )}
          />
          <span className="text-sm text-default-700 dark:text-default-300 font-medium lg:hidden">
            {t('shipping.admin.active')}
          </span>
        </div>
        
        {/* StatusPill displayed on desktop column 4 */}
        <div className="hidden lg:block">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <StatusPill
                active={field.value}
                activeLabel={t('shipping.admin.active')}
                inactiveLabel={t('shipping.admin.inactive')}
              />
            )}
          />
        </div>
      </div>

      {/* COLUMN 5: LAST UPDATED (Desktop only) */}
      <div className="hidden lg:block text-xs text-default-500 tabular-nums">
        {formatDate(governorate.updatedAt, lang, 'YYYY-MM-DD HH:mm')}
      </div>

      {/* COLUMN 6: ACTIONS (Responsive) */}
      <div className="w-full lg:w-28 flex flex-col items-stretch lg:items-center">
        {/* Mobile/Tablet subtext for last updated & alternative name */}
        <div className="flex flex-col gap-0.5 text-2xs text-default-400 mb-2 lg:hidden">
          <p>{secondaryName}</p>
          <p>{t('shipping.admin.updatedAtValue', { value: formatDate(governorate.updatedAt, lang, 'YYYY-MM-DD HH:mm') })}</p>
        </div>
        
        <Button
          type="submit"
          variant="primary"
          isPending={pending}
          isDisabled={pending || !isDirty}
          className="w-full py-1.5 px-4 font-medium text-sm transition-all shadow-sm rounded-medium"
          size="sm"
        >
          {pending ? t('shipping.admin.saving') : t('shipping.admin.save')}
        </Button>
      </div>
    </Form>
  );
}
