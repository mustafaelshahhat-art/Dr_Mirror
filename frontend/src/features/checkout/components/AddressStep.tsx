import { Button, Checkbox, Fieldset, Radio, RadioGroup } from '@heroui/react';
import { Plus } from 'lucide-react';
import type { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { BuyerAddressDto } from '../../addresses/types';
import { FormField } from '../../auth/components/FormField';
import { StatusAlert } from '../../../shared/components/StatusAlert';
import { Skeleton } from '../../../shared/components/Skeleton';
import type { CheckoutForm } from '../schemas';
import { GovernorateSelect } from './GovernorateSelect';
import type { AppLang } from '../../../shared/lib/theme-storage';

interface Props {
  control: Control<CheckoutForm>;
  watch: UseFormWatch<CheckoutForm>;
  setValue: UseFormSetValue<CheckoutForm>;
  savedAddresses: BuyerAddressDto[];
  savedAddressId: string | null;
  setSavedAddressId: (id: string | null) => void;
  saveAsNewAddress: boolean;
  setSaveAsNewAddress: (v: boolean) => void;
  /** True while the saved-addresses query is still in flight. */
  isLoading?: boolean;
  /** True when the saved-addresses query failed. */
  isError?: boolean;
  /** Refetch callback for the error retry button. */
  onRetry?: () => void;
  lang?: AppLang;
}

const NEW_ADDRESS_VALUE = '__new-address__';

export function AddressStep({
  control,
  watch,
  setValue,
  savedAddresses,
  savedAddressId,
  setSavedAddressId,
  saveAsNewAddress,
  setSaveAsNewAddress,
  isLoading = false,
  isError = false,
  onRetry,
  lang = 'ar',
}: Props) {
  const { t } = useTranslation();

  // While the saved-addresses query is pending we deliberately render neither
  // the saved list nor the new-address form. Both states are derived from the
  // query result, so showing either before it settles flashes the wrong UI
  // (e.g. the new-address form for a buyer who actually has saved addresses).
  if (isLoading) {
    return (
      <Fieldset className="space-y-4">
        <Fieldset.Legend className="text-sm font-semibold uppercase tracking-wide text-default-600">
          {t('checkout.address.heading')}
        </Fieldset.Legend>
        <div
          className="space-y-2"
          aria-busy="true"
          aria-label={t('checkout.address.loading')}
        >
          <Skeleton className="h-4 w-32" />
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-divider bg-content1 p-3.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            ))}
          </div>
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </Fieldset>
    );
  }

  // Loading failed: surface a clear error with a retry affordance instead of
  // silently falling through to the new-address form (which would look like
  // "you have no saved addresses").
  if (isError) {
    return (
      <Fieldset className="space-y-4">
        <Fieldset.Legend className="text-sm font-semibold uppercase tracking-wide text-default-600">
          {t('checkout.address.heading')}
        </Fieldset.Legend>
        <StatusAlert variant="danger" className="rounded-xl flex items-center justify-between gap-3">
          <span>{t('checkout.address.errorLoad')}</span>
          {onRetry ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={onRetry}
              className="shrink-0 rounded-xl text-danger hover:bg-danger/10"
            >
              {t('checkout.address.retry')}
            </Button>
          ) : null}
        </StatusAlert>
      </Fieldset>
    );
  }

  return (
    <Fieldset className="space-y-4">
      <Fieldset.Legend className="text-sm font-semibold uppercase tracking-wide text-default-600">
        {t('checkout.address.heading')}
      </Fieldset.Legend>

      {savedAddresses.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-default-600 font-medium">
            {t('checkout.address.savedHeading')}
          </p>
          <RadioGroup
            className="space-y-3"
            aria-label={t('checkout.address.savedHeading')}
            value={savedAddressId ?? NEW_ADDRESS_VALUE}
            onChange={(value) => setSavedAddressId(value === NEW_ADDRESS_VALUE ? null : value)}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {savedAddresses.map((a) => {
                const localizedGov = t(`governorates.${a.governorate}`, a.governorate);
                return (
                  <Radio
                    key={a.id}
                    value={a.id}
                    className={({ isFocusVisible, isSelected }) => [
                      'cursor-pointer rounded-xl border p-3.5 text-start transition-all duration-200',
                      isFocusVisible ? 'outline outline-2 outline-offset-2 outline-brand' : '',
                      isSelected
                        ? 'border-brand bg-brand-subtle'
                        : 'border-divider bg-content1 hover:bg-content2',
                    ].filter(Boolean).join(' ')}
                  >
                    <p className="text-sm font-semibold">
                      {a.label}
                      {a.isDefault ? (
                        <span className="ms-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {t('addresses.defaultBadge')}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-default-500">
                      {a.phone}
                    </p>
                    <p className="text-xs text-default-700 dark:text-default-300">
                      {a.streetAddress}
                    </p>
                    <p className="text-xs text-default-700 dark:text-default-300">
                      {a.city}, {localizedGov}
                    </p>
                  </Radio>
                );
              })}
            </div>
            {/* The new-address tile lives on its own row below the saved grid
                so it reads as an action (not a broken address card). It still
                shares the RadioGroup value so selection and validation work. */}
            <Radio
              value={NEW_ADDRESS_VALUE}
              className={({ isFocusVisible, isSelected }) => [
                'block cursor-pointer rounded-xl border border-dashed p-3.5 text-start transition-all duration-200',
                isFocusVisible ? 'outline outline-2 outline-offset-2 outline-primary' : '',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-divider/80 hover:bg-content2',
              ].filter(Boolean).join(' ')}
            >
              <span className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-default-100 dark:bg-default-200/50">
                  <Plus className="size-4 shrink-0 text-default-500" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium">
                    {t('checkout.address.useNew.title')}
                  </span>
                  <span className="block text-xs text-default-500">
                    {t('checkout.address.useNew.subtitle')}
                  </span>
                </span>
              </span>
            </Radio>
          </RadioGroup>
        </div>
      ) : null}

      {savedAddressId === null ? (
        <div className="space-y-4 rounded-2xl border border-separator/40 bg-surface-secondary/30 p-4 dark:bg-surface-secondary/20">
          <FormField
            name="address.recipientName"
            control={control}
            label={t('checkout.address.recipientName')}
            autoComplete="name"
            isRequired
          />
          <FormField
            name="address.phone"
            control={control}
            label={t('checkout.address.phone')}
            type="tel"
            autoComplete="tel"
            isRequired
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <GovernorateSelect
              // eslint-disable-next-line i18next/no-literal-string -- react-hook-form field path, not user copy
              value={watch('address.governorate')}
              lang={lang}
              onChange={(slug, governorate) => {
                // eslint-disable-next-line i18next/no-literal-string -- react-hook-form field path, not user copy
                setValue('address.governorate', governorate?.slug ?? slug, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            />
            <FormField
              name="address.city"
              control={control}
              label={t('checkout.address.city')}
              autoComplete="address-level2"
              isRequired
            />
          </div>
          <FormField
            name="address.streetAddress"
            control={control}
            label={t('checkout.address.streetAddress')}
            autoComplete="street-address"
            isRequired
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              name="address.floor"
              control={control}
              label={t('checkout.address.floor')}
            />
            <FormField
              name="address.apartment"
              control={control}
              label={t('checkout.address.apartment')}
            />
            <FormField
              name="address.landmark"
              control={control}
              label={t('checkout.address.landmark')}
            />
          </div>
          <FormField
            name="address.notes"
            control={control}
            label={t('checkout.address.notes')}
            description={t('checkout.address.notesHint')}
          />

          <Checkbox
            isSelected={saveAsNewAddress}
            onChange={setSaveAsNewAddress}
          >
            <span className="text-sm">{t('checkout.address.saveAsNew')}</span>
          </Checkbox>
          {saveAsNewAddress ? (
            <FormField
              name="label"
              control={control}
              label={t('checkout.address.newLabel')}
              placeholder={t('checkout.address.newLabelPlaceholder')}
            />
          ) : null}
        </div>
      ) : null}
    </Fieldset>
  );
}
