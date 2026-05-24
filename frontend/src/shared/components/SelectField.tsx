import { Description, FieldError, Label, ListBox, Select } from '@heroui/react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EMPTY_OPTION_VALUE = '__empty__';

export interface SelectFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: SelectFieldOption[];
  emptyLabel?: string;
  placeholder?: string;
  isRequired?: boolean;
  hideLabel?: boolean;
  className?: string;
  description?: string;
  errorMessage?: string | null;
  isFilter?: boolean;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  emptyLabel,
  placeholder,
  isRequired,
  hideLabel,
  className,
  description,
  errorMessage,
  isFilter = false,
}: SelectFieldProps) {
  const { t } = useTranslation();
  const renderedOptions = emptyLabel
    ? [{ value: EMPTY_OPTION_VALUE, label: emptyLabel }, ...options]
    : options;
  const selectedValue = value === '' && emptyLabel ? EMPTY_OPTION_VALUE : value || null;
  const disabledKeys = renderedOptions
    .filter((option) => option.disabled)
    .map((option) => option.value);

  const isSelected = value && value !== EMPTY_OPTION_VALUE && value !== 'all' && value !== '';

  // Focus ring: eucalyptus teal brand color (oklch(58% 0.085 175))
  const focusRingClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:border-brand';

  const triggerClass = isFilter
    ? `flex items-center justify-between w-full h-10 px-4 text-xs font-semibold border transition-all duration-300 rounded-full cursor-pointer group-data-[invalid=true]:border-danger/60 group-data-[invalid=true]:hover:border-danger ${
        isSelected
          ? 'border-brand bg-brand text-white hover:bg-brand-hover hover:border-brand-hover'
          : 'border-default-200/60 bg-default-100/30 dark:bg-default-50/10 hover:border-brand/40 hover:bg-brand/5 dark:hover:bg-brand/10 text-default-700 dark:text-default-300'
      } ${focusRingClass}`
    : `flex items-center justify-between w-full h-10 px-3 text-sm border border-divider/60 bg-field-background hover:border-default-400 transition-all duration-200 rounded-[0.5rem] cursor-pointer group-data-[invalid=true]:border-danger/60 group-data-[invalid=true]:hover:border-danger ${focusRingClass}`;

  return (
    <Select
      validationBehavior="aria"
      value={selectedValue}
      onChange={(next: unknown) => {
        if (next === null || Array.isArray(next) || next === EMPTY_OPTION_VALUE) {
          onChange('');
        } else {
          onChange(String(next));
        }
      }}
      isRequired={isRequired}
      isInvalid={Boolean(errorMessage)}
      disabledKeys={disabledKeys.length ? disabledKeys : undefined}
      placeholder={placeholder}
      variant="secondary"
      fullWidth
      className={className}
    >
      <Label className={hideLabel ? 'sr-only' : 'text-sm uppercase tracking-wide text-default-600 font-medium'}>
        {label}
      </Label>
      <Select.Trigger className={triggerClass}>
        <Select.Value className={`text-start font-medium ${isSelected && isFilter ? 'text-white' : 'text-default-700 dark:text-default-300'}`} />
        <div className="flex items-center gap-1 shrink-0">
          {isFilter && isSelected ? (
            <span
              role="button"
              tabIndex={0}
              className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
              aria-label={t('common.clear') || 'Clear'}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onChange('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange('');
                }
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : null}
          <Select.Indicator className={`transition-transform duration-300 group-data-[open=true]:rotate-180 ${isSelected && isFilter ? 'text-white/80' : 'text-default-400'}`} />
        </div>
      </Select.Trigger>
      <Select.Popover className="max-h-72 overflow-y-auto overscroll-contain border border-default-200/60 bg-background/85 backdrop-blur-md shadow-lg rounded-large">
        <ListBox className="p-1">
          {renderedOptions.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
              className="rounded-medium px-3 py-1.5 text-xs font-semibold text-default-700 dark:text-default-300 hover:bg-brand hover:text-brand-foreground transition-all duration-200 cursor-pointer"
            >
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      {description ? (
        <Description className="text-xs text-default-500">{description}</Description>
      ) : null}
      {errorMessage ? (
        <FieldError className="text-xs text-danger mt-1">
          <span role="alert">{errorMessage}</span>
        </FieldError>
      ) : null}
    </Select>
  );
}
