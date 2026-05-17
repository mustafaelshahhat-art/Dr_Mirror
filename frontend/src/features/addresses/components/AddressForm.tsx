import { Button, Checkbox, Description, Form, Input, Label, TextField } from '@heroui/react';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../../auth/types';
import type { BuyerAddressDto, BuyerAddressUpsertRequest } from '../types';

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

/**
 * Plain-state buyer address form used by both the create and edit flows on
 * the address-book page. Mirrors the backend's <c>BuyerAddressUpsertValidator</c>:
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

  const [label, setLabel] = useState(initial?.label ?? '');
  const [recipientName, setRecipientName] = useState(initial?.recipientName ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [governorate, setGovernorate] = useState(initial?.governorate ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [streetAddress, setStreetAddress] = useState(initial?.streetAddress ?? '');
  const [floor, setFloor] = useState(initial?.floor ?? '');
  const [apartment, setApartment] = useState(initial?.apartment ?? '');
  const [landmark, setLandmark] = useState(initial?.landmark ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [setDefault, setSetDefault] = useState(initial?.isDefault ?? Boolean(isFirstAddress));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setDefaultLocked = Boolean(isFirstAddress);

  return (
    <Form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!governorate) {
          setError(t('addresses.errors.governorateRequired'));
          return;
        }
        setSubmitting(true);
        try {
          await onSubmit({
            label: label.trim(),
            recipientName: recipientName.trim(),
            phone: phone.trim(),
            governorate,
            city: city.trim(),
            streetAddress: streetAddress.trim(),
            floor: floor.trim() || null,
            apartment: apartment.trim() || null,
            landmark: landmark.trim() || null,
            notes: notes.trim() || null,
            setDefault,
          });
        } catch (err) {
          const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
          setError(problem?.detail ?? problem?.title ?? t('addresses.errors.unknown'));
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-4 rounded-large border border-divider/60 bg-content1 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t('addresses.fields.label')}
          value={label}
          onChange={setLabel}
          required
          maxLength={64}
          description={t('addresses.fields.labelHint')}
        />
        <Field label={t('addresses.fields.recipientName')} value={recipientName} onChange={setRecipientName} required maxLength={100} />
        <Field
          label={t('addresses.fields.phone')}
          value={phone}
          onChange={setPhone}
          required
          dir="ltr"
          description={t('addresses.fields.phoneHint')}
        />
        <GovernorateSelect
          label={t('addresses.fields.governorate')}
          value={governorate}
          onChange={setGovernorate}
          required
        />
        <Field label={t('addresses.fields.city')} value={city} onChange={setCity} required maxLength={100} />
        <Field label={t('addresses.fields.streetAddress')} value={streetAddress} onChange={setStreetAddress} required maxLength={200} />
        <Field label={t('addresses.fields.floor')} value={floor} onChange={setFloor} maxLength={50} />
        <Field label={t('addresses.fields.apartment')} value={apartment} onChange={setApartment} maxLength={50} />
        <Field label={t('addresses.fields.landmark')} value={landmark} onChange={setLandmark} maxLength={200} />
        <Field label={t('addresses.fields.notes')} value={notes} onChange={setNotes} maxLength={500} />
      </div>

      <Checkbox
        isSelected={setDefault}
        isDisabled={setDefaultLocked}
        onChange={setSetDefault}
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

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" isDisabled={submitting}>
          {submitting ? pendingLabel : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onPress={onCancel} isDisabled={submitting}>
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
  required,
  maxLength,
  description,
  dir,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
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
        maxLength={maxLength}
        dir={dir}
      />
      {description ? (
        <Description className="text-[11px] text-default-500">{description}</Description>
      ) : null}
    </TextField>
  );
}
