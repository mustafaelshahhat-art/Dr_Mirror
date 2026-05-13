import type { HTMLInputTypeAttribute, ReactNode } from 'react';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import {
  Description,
  FieldError,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import { useTranslation } from 'react-i18next';

interface FormFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
  placeholder?: string;
  description?: ReactNode;
  isRequired?: boolean;
  isDisabled?: boolean;
}

/**
 * Glue between react-hook-form and HeroUI v3's RAC-based TextField composition.
 * The error message stored by RHF is a translation key — we look it up here so
 * pages just pass `name`/`control`/`label` and forget about i18n plumbing.
 */
export function FormField<T extends FieldValues>({
  name,
  control,
  label,
  type = 'text',
  autoComplete,
  placeholder,
  description,
  isRequired,
  isDisabled,
}: FormFieldProps<T>) {
  const { t } = useTranslation();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          value={(field.value as string | undefined) ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          isInvalid={!!fieldState.error}
          isRequired={isRequired}
          isDisabled={isDisabled}
          className="flex flex-col gap-1.5"
        >
          <Label className="text-sm font-medium">{label}</Label>
          <Input
            ref={field.ref}
            type={type}
            autoComplete={autoComplete}
            placeholder={placeholder}
          />
          {description ? (
            <Description className="text-xs text-default-500">{description}</Description>
          ) : null}
          {fieldState.error?.message ? (
            <FieldError className="text-xs text-danger">
              {t(fieldState.error.message)}
            </FieldError>
          ) : null}
        </TextField>
      )}
    />
  );
}
