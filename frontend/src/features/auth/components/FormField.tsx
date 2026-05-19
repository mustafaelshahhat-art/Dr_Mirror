import { useState, type HTMLInputTypeAttribute, type ReactNode } from 'react';
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import {
  Button,
  Description,
  FieldError,
  Input,
  InputGroup,
  Label,
  TextField,
} from '@heroui/react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FormFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
  autoCapitalize?: string;
  placeholder?: string;
  description?: ReactNode;
  isRequired?: boolean;
  isDisabled?: boolean;
  variant?: 'bordered' | 'underlined';
}

/**
 * Glue between react-hook-form and HeroUI v3's RAC-based TextField composition.
 * The error message stored by RHF is a translation key — we look it up here so
 * pages just pass `name`/`control`/`label` and forget about i18n plumbing.
 *
 * For `type="password"`, the input is wrapped in HeroUI `InputGroup` with an
 * eye / eye-off reveal toggle as `InputGroup.Suffix` per data-model.md Anatomy
 * A.18 + tasks T124a.
 */
export function FormField<T extends FieldValues>({
  name,
  control,
  label,
  type = 'text',
  autoComplete,
  autoCapitalize,
  placeholder,
  description,
  isRequired,
  isDisabled,
  variant = 'bordered',
}: FormFieldProps<T>) {
  const { t } = useTranslation();
  const isPassword = type === 'password';
  const [revealed, setRevealed] = useState(false);
  const effectiveType = isPassword && revealed ? 'text' : type;
  const fieldClass = variant === 'underlined'
    ? 'rounded-none border-0 border-b bg-transparent dark:bg-default-100/50'
    : 'border border-default-400 dark:border-default-300';
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
          type={effectiveType}
          className="flex flex-col gap-1.5"
        >
          <Label className="text-sm font-medium">{label}</Label>
          {isPassword ? (
            <InputGroup className={fieldClass}>
              <InputGroup.Input
                ref={field.ref}
                type={effectiveType}
                autoComplete={autoComplete}
                autoCapitalize={autoCapitalize}
                placeholder={placeholder}
              />
              <InputGroup.Suffix className="pe-1">
                <Button
                  type="button"
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  aria-label={revealed ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={revealed}
                  onPress={() => setRevealed((v) => !v)}
                  isDisabled={isDisabled}
                >
                  {revealed ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </Button>
              </InputGroup.Suffix>
            </InputGroup>
          ) : (
            <Input
              ref={field.ref}
              type={effectiveType}
              autoComplete={autoComplete}
              autoCapitalize={autoCapitalize}
              placeholder={placeholder}
              className={fieldClass}
            />
          )}
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
