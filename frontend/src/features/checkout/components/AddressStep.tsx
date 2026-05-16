import { Checkbox } from '@heroui/react';
import type { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { GovernorateSelect } from '../../addresses/components/GovernorateSelect';
import type { BuyerAddressDto } from '../../addresses/types';
import { FormField } from '../../auth/components/FormField';
import type { CheckoutForm } from '../schemas';

interface Props {
  control: Control<CheckoutForm>;
  watch: UseFormWatch<CheckoutForm>;
  setValue: UseFormSetValue<CheckoutForm>;
  savedAddresses: BuyerAddressDto[];
  savedAddressId: string | null;
  setSavedAddressId: (id: string | null) => void;
  saveAsNewAddress: boolean;
  setSaveAsNewAddress: (v: boolean) => void;
  newAddressLabel: string;
  setNewAddressLabel: (v: string) => void;
}

export function AddressStep({
  control,
  watch,
  setValue,
  savedAddresses,
  savedAddressId,
  setSavedAddressId,
  saveAsNewAddress,
  setSaveAsNewAddress,
  newAddressLabel,
  setNewAddressLabel,
}: Props) {
  const { t } = useTranslation();

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold uppercase tracking-wide text-default-600">
        {t('checkout.address.heading')}
      </legend>

      {savedAddresses.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-default-500">
            {t('checkout.address.savedHeading')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {savedAddresses.map((a) => {
              const localizedGov = t(`governorates.${a.governorate}`, a.governorate);
              const isSelected = savedAddressId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSavedAddressId(a.id)}
                  className={[
                    'rounded-medium border p-3 text-start transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-divider bg-content1 hover:bg-content2',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold">
                    {a.label}
                    {a.isDefault ? (
                      <span className="ms-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0 text-xs font-medium text-primary">
                        {t('addresses.defaultBadge')}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-default-500" dir="ltr">
                    {a.phone}
                  </p>
                  <p className="text-xs text-default-700 dark:text-default-300">
                    {a.streetAddress}
                  </p>
                  <p className="text-xs text-default-700 dark:text-default-300">
                    {a.city}, {localizedGov}
                  </p>
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={savedAddressId === null}
              onClick={() => setSavedAddressId(null)}
              className={[
                'rounded-medium border p-3 text-start text-sm transition-colors',
                savedAddressId === null
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-divider bg-content1 hover:bg-content2',
              ].join(' ')}
            >
              <p className="font-semibold">{t('checkout.address.useNew.title')}</p>
              <p className="text-xs text-default-500">
                {t('checkout.address.useNew.subtitle')}
              </p>
            </button>
          </div>
        </div>
      ) : null}

      {savedAddressId === null ? (
        <>
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
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-sm font-medium">
                {t('checkout.address.governorate')}
              </span>
              <GovernorateSelect
                value={watch('address.governorate')}
                onChange={(slug) =>
                  setValue('address.governorate', slug, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                required
              />
            </label>
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
            onValueChange={setSaveAsNewAddress}
            size="sm"
          >
            <span className="text-sm">{t('checkout.address.saveAsNew')}</span>
          </Checkbox>
          {saveAsNewAddress ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs uppercase tracking-wide text-default-500">
                {t('checkout.address.newLabel')}
              </span>
              <input
                value={newAddressLabel}
                onChange={(e) => setNewAddressLabel(e.target.value)}
                maxLength={64}
                placeholder={t('checkout.address.newLabelPlaceholder')}
                className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm"
              />
            </label>
          ) : null}
        </>
      ) : null}
    </fieldset>
  );
}
