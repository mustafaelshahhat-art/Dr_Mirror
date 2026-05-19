import { Checkbox, Fieldset, Input, Label, Radio, RadioGroup, TextField } from '@heroui/react';
import { Plus } from 'lucide-react';
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
  newAddressLabel,
  setNewAddressLabel,
}: Props) {
  const { t } = useTranslation();

  return (
    <Fieldset className="space-y-4">
      <Fieldset.Legend className="text-sm font-semibold uppercase tracking-wide text-default-600">
        {t('checkout.address.heading')}
      </Fieldset.Legend>

      {savedAddresses.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-default-500">
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
                      'cursor-pointer rounded-medium border p-3 text-start transition-colors',
                      isFocusVisible ? 'outline outline-2 outline-offset-2 outline-primary' : '',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-divider bg-content1 hover:bg-content2',
                    ].filter(Boolean).join(' ')}
                  >
                    <p className="text-sm font-semibold">
                      {a.label}
                      {a.isDefault ? (
                        <span className="ms-2 inline-flex items-center rounded-medium border border-primary/30 bg-primary/10 px-2 py-0 text-xs font-medium text-primary">
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
                'block cursor-pointer rounded-medium border border-dashed p-3 text-start transition-colors',
                isFocusVisible ? 'outline outline-2 outline-offset-2 outline-primary' : '',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-divider/80 hover:bg-content2',
              ].filter(Boolean).join(' ')}
            >
              <span className="flex items-center gap-3">
                <Plus className="size-5 shrink-0 text-default-500" aria-hidden />
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
            <GovernorateSelect
              label={t('checkout.address.governorate')}
              // eslint-disable-next-line i18next/no-literal-string
              value={watch('address.governorate')}
              onChange={(slug) =>
                // eslint-disable-next-line i18next/no-literal-string
                setValue('address.governorate', slug, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              required
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
            <TextField className="flex flex-col gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-default-500">
                {t('checkout.address.newLabel')}
              </Label>
              <Input
                value={newAddressLabel}
                onChange={(e) => setNewAddressLabel((e.target as HTMLInputElement).value)}
                maxLength={64}
                placeholder={t('checkout.address.newLabelPlaceholder')}
              />
            </TextField>
          ) : null}
        </>
      ) : null}
    </Fieldset>
  );
}
