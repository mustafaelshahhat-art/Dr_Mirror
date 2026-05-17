import { Label, ListBox, Select } from '@heroui/react';

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
}: SelectFieldProps) {
  const renderedOptions = emptyLabel
    ? [{ value: EMPTY_OPTION_VALUE, label: emptyLabel }, ...options]
    : options;
  const selectedValue = value === '' && emptyLabel ? EMPTY_OPTION_VALUE : value || null;
  const disabledKeys = renderedOptions
    .filter((option) => option.disabled)
    .map((option) => option.value);

  return (
    <Select
      value={selectedValue}
      onChange={(next: unknown) => {
        if (next === null || Array.isArray(next) || next === EMPTY_OPTION_VALUE) {
          onChange('');
          return;
        }
        onChange(String(next));
      }}
      isRequired={isRequired}
      disabledKeys={disabledKeys.length ? disabledKeys : undefined}
      placeholder={placeholder}
      variant="secondary"
      fullWidth
      className={className}
    >
      <Label className={hideLabel ? 'sr-only' : 'text-xs uppercase tracking-wide text-default-500'}>
        {label}
      </Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {renderedOptions.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
