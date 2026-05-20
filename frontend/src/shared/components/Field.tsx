import { Description, FieldError, Input, Label, TextArea, TextField } from '@heroui/react';
import type { HTMLInputTypeAttribute } from 'react';

/**
 * Shared form-field wrappers for admin forms. Standardize label styling,
 * spacing, and description rendering so ProductMasterForm,
 * ProductVariantsSection, ProductImagesSection, AdminPaymentMethodsPage, and
 * the product create page all read the same. HeroUI primitives still own the
 * underlying control behavior.
 *
 * The wrappers stay deliberately thin — composite controls (variant grids,
 * image dropzones) keep their bespoke layout. Only the label+input+helper
 * row pattern is unified.
 */

const LABEL_CLASS = 'text-sm uppercase tracking-wide text-default-600 font-medium';
const DESCRIPTION_CLASS = 'text-xs text-default-500';

export interface FieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: HTMLInputTypeAttribute;
  required?: boolean;
  maxLength?: number;
  dir?: 'ltr' | 'rtl';
  description?: string;
  placeholder?: string;
  errorMessage?: string | null;
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  maxLength,
  dir,
  description,
  placeholder,
  errorMessage,
}: FieldProps) {
  return (
    <TextField isRequired={required} isInvalid={Boolean(errorMessage)} className="flex flex-col gap-1">
      <Label className={LABEL_CLASS}>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        type={type}
        maxLength={maxLength}
        dir={dir}
        placeholder={placeholder}
      />
      {description ? (
        <Description className={DESCRIPTION_CLASS}>{description}</Description>
      ) : null}
      {errorMessage ? (
        <FieldError className="text-xs text-danger">{errorMessage}</FieldError>
      ) : null}
    </TextField>
  );
}

export interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  spanFull?: boolean;
  errorMessage?: string | null;
}

export function TextAreaField({
  label,
  value,
  onChange,
  required,
  maxLength,
  rows = 3,
  spanFull = true,
  errorMessage,
}: TextAreaFieldProps) {
  return (
    <TextField
      isRequired={required}
      isInvalid={Boolean(errorMessage)}
      className={`flex flex-col gap-1${spanFull ? ' sm:col-span-2' : ''}`}
    >
      <Label className={LABEL_CLASS}>{label}</Label>
      <TextArea
        value={value}
        onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
        maxLength={maxLength}
        rows={rows}
      />
      {errorMessage ? (
        <FieldError className="text-xs text-danger">{errorMessage}</FieldError>
      ) : null}
    </TextField>
  );
}
