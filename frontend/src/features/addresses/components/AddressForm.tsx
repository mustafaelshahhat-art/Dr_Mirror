import { Button, Checkbox, Description, FieldError, Fieldset, Form, Input, Label, TextField } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { GOVERNORATE_SLUGS, type BuyerAddressDto, type BuyerAddressUpsertRequest } from '../types';

import { GovernorateSelect } from './GovernorateSelect';

interface AddressFormProps {
  initial?: BuyerAddressDto;
  /** True iff this is the very first address — the form forces SetDefault to true and disables the toggle. */
  isFirstAddress?: boolean;
  onSubmit: (body: BuyerAddressUpsertRequest) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  pendingLabel: string;
}

const egyptPhoneRegex = /^\+?2?01[0125]\d{8}$/;

const addressFormSchema = z.object({
  label: z.string().trim().min(1, 'addresses.errors.labelRequired').max(64, 'addresses.errors.labelTooLong'),
  recipientName: z.string().trim().min(2, 'checkout.errors.recipientNameTooShort').max(100, 'checkout.errors.recipientNameTooLong'),
  phone: z.string().trim().regex(egyptPhoneRegex, 'checkout.errors.phoneInvalid'),
  governorate: z.string().refine(
    (value) => GOVERNORATE_SLUGS.includes(value as (typeof GOVERNORATE_SLUGS)[number]),
    'addresses.errors.governorateRequired',
  ),
  city: z.string().trim().min(2, 'checkout.errors.cityRequired').max(100, 'checkout.errors.cityTooLong'),
  streetAddress: z.string().trim().min(5, 'checkout.errors.streetAddressRequired').max(200, 'checkout.errors.streetAddressTooLong'),
  floor: z.string().trim().max(50, 'checkout.errors.floorTooLong'),
  apartment: z.string().trim().max(50, 'checkout.errors.apartmentTooLong'),
  landmark: z.string().trim().max(200, 'checkout.errors.landmarkTooLong'),
  notes: z.string().trim().max(500, 'checkout.errors.notesTooLong'),
  setDefault: z.boolean(),
});

type AddressFormValues = z.infer<typeof addressFormSchema>;

/**
 * Buyer address form used by both the create and edit flows on the address-book
 * page. Mirrors the backend's <c>BuyerAddressUpsertValidator</c>:
 *   - phone matches the Egyptian regex,
 *   - governorate must be one of the 27 canonical slugs,
 *   - label / recipient / city / streetAddress are required.
 */
export function AddressForm({
  initial,
  isFirstAddress,
  onSubmit,
  onCancel,
  submitLabel,
  pendingLabel,
}: AddressFormProps) {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      label: initial?.label ?? '',
      recipientName: initial?.recipientName ?? '',
      phone: initial?.phone ?? '',
      governorate: initial?.governorate ?? '',
      city: initial?.city ?? '',
      streetAddress: initial?.streetAddress ?? '',
      floor: initial?.floor ?? '',
      apartment: initial?.apartment ?? '',
      landmark: initial?.landmark ?? '',
      notes: initial?.notes ?? '',
      setDefault: initial?.isDefault ?? Boolean(isFirstAddress),
    },
  });

  const setDefaultLocked = Boolean(isFirstAddress);
  const error = (message?: string) => (message ? t(message) : null);
  const blankToNull = (value: string) => value.trim() || null;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({
        label: values.label.trim(),
        recipientName: values.recipientName.trim(),
        phone: values.phone.trim(),
        governorate: values.governorate,
        city: values.city.trim(),
        streetAddress: values.streetAddress.trim(),
        floor: blankToNull(values.floor),
        apartment: blankToNull(values.apartment),
        landmark: blankToNull(values.landmark),
        notes: blankToNull(values.notes),
        setDefault: values.setDefault,
      });
    } catch {
      // Toast emitted by mutation onError.
    }
  });

  return (
    <Form
      onSubmit={submit}
      className="cq space-y-4 rounded-large border border-divider/60 bg-content1 p-4"
    >
      <Fieldset>
        <Fieldset.Legend className="text-xs uppercase tracking-wide text-default-500">
          {t('addresses.form.contactLegend')}
        </Fieldset.Legend>
        <Fieldset.Group className="grid gap-3 @lg:grid-cols-2">
          <Controller name="label" control={control} render={({ field }) => (
            <Field {...field} label={t('addresses.fields.label')} required maxLength={64} description={t('addresses.fields.labelHint')} errorMessage={error(errors.label?.message)} />
          )} />
          <Controller name="recipientName" control={control} render={({ field }) => (
            <Field {...field} label={t('addresses.fields.recipientName')} required maxLength={100} errorMessage={error(errors.recipientName?.message)} />
          )} />
          <Controller name="phone" control={control} render={({ field }) => (
            <Field {...field} label={t('addresses.fields.phone')} required dir="ltr" description={t('addresses.fields.phoneHint')} errorMessage={error(errors.phone?.message)} />
          )} />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend className="text-xs uppercase tracking-wide text-default-500">
          {t('addresses.form.locationLegend')}
        </Fieldset.Legend>
        <Fieldset.Group className="grid gap-3 @lg:grid-cols-2">
          <Controller name="governorate" control={control} render={({ field }) => (
            <GovernorateSelect label={t('addresses.fields.governorate')} value={field.value} onChange={field.onChange} required errorMessage={error(errors.governorate?.message)} />
          )} />
          <Controller name="city" control={control} render={({ field }) => (
            <Field {...field} label={t('addresses.fields.city')} required maxLength={100} errorMessage={error(errors.city?.message)} />
          )} />
          <Controller name="streetAddress" control={control} render={({ field }) => (
            <Field {...field} label={t('addresses.fields.streetAddress')} required maxLength={200} errorMessage={error(errors.streetAddress?.message)} />
          )} />
          <Controller name="floor" control={control} render={({ field }) => (
            <Field {...field} label={t('addresses.fields.floor')} maxLength={50} errorMessage={error(errors.floor?.message)} />
          )} />
          <Controller name="apartment" control={control} render={({ field }) => (
            <Field {...field} label={t('addresses.fields.apartment')} maxLength={50} errorMessage={error(errors.apartment?.message)} />
          )} />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend className="text-xs uppercase tracking-wide text-default-500">
          {t('addresses.form.extraLegend')}
        </Fieldset.Legend>
        <Fieldset.Group className="grid gap-3 @lg:grid-cols-2">
          <Controller name="landmark" control={control} render={({ field }) => (
            <Field {...field} label={t('addresses.fields.landmark')} maxLength={200} errorMessage={error(errors.landmark?.message)} />
          )} />
          <Controller name="notes" control={control} render={({ field }) => (
            <Field {...field} label={t('addresses.fields.notes')} maxLength={500} errorMessage={error(errors.notes?.message)} />
          )} />
        </Fieldset.Group>
      </Fieldset>

      <Controller name="setDefault" control={control} render={({ field }) => (
        <Checkbox
          isSelected={field.value}
          isDisabled={setDefaultLocked}
          onChange={field.onChange}
        >
          <span className="text-sm">
            {t('addresses.fields.setDefault')}
            {setDefaultLocked ? (
              <span className="ms-2 text-xs text-default-500">
                ({t('addresses.fields.firstAddressNote')})
              </span>
            ) : null}
          </span>
        </Checkbox>
      )} />

      <div className="flex gap-2">
        <Button type="submit" variant="primary" isPending={isSubmitting}>
          {isSubmitting ? pendingLabel : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onPress={onCancel} isDisabled={isSubmitting}>
          {t('addresses.actions.cancel')}
        </Button>
      </div>
    </Form>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  name,
  required,
  maxLength,
  description,
  dir,
  errorMessage,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  name?: string;
  required?: boolean;
  maxLength?: number;
  description?: string;
  dir?: 'ltr' | 'rtl';
  errorMessage?: string | null;
}) {
  return (
    <TextField isRequired={required} isInvalid={Boolean(errorMessage)} className="flex flex-col gap-1">
      <Label className="text-xs uppercase tracking-wide text-default-500">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        onBlur={onBlur}
        name={name}
        maxLength={maxLength}
        dir={dir}
      />
      {description ? (
        <Description className="text-xs text-default-500">{description}</Description>
      ) : null}
      {errorMessage ? (
        <FieldError className="text-xs text-danger">{errorMessage}</FieldError>
      ) : null}
    </TextField>
  );
}
