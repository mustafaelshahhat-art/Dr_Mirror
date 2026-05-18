import { Accordion, Button, Input, Label, TextField } from '@heroui/react';
import type { KeyboardEvent } from 'react';
import { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { genderTranslationKey } from '../hooks';
import type { ProductFilter, ProductGender } from '../types';

interface FilterPanelProps {
  filter: ProductFilter;
  onGenderChange: (g: ProductGender | undefined) => void;
  onSizeChange: (s: string) => void;
  onColorChange: (c: string) => void;
  onMinPriceChange: (v: string) => void;
  onMaxPriceChange: (v: string) => void;
  onClearAll: () => void;
}

const GENDERS: ProductGender[] = [0, 1, 2];

export function FilterPanel({
  filter,
  onGenderChange,
  onSizeChange,
  onColorChange,
  onMinPriceChange,
  onMaxPriceChange,
  onClearAll,
}: FilterPanelProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const [open, setOpen] = useState(
    filter.gender !== undefined ||
    Boolean(filter.size) ||
    Boolean(filter.color) ||
    filter.minPrice !== undefined ||
    filter.maxPrice !== undefined,
  );

  const activeCount = [
    filter.gender !== undefined,
    Boolean(filter.size),
    Boolean(filter.color),
    filter.minPrice !== undefined,
    filter.maxPrice !== undefined,
  ].filter(Boolean).length;

  const defaultExpandedKeys = [
    filter.gender !== undefined ? 'gender' : null,
    filter.size ? 'size' : null,
    filter.color ? 'color' : null,
    filter.minPrice !== undefined || filter.maxPrice !== undefined ? 'price' : null,
  ].filter((key): key is string => key !== null);
  const expandedKeys = defaultExpandedKeys.length > 0
    ? defaultExpandedKeys
    : ['gender', 'size', 'color', 'price'];

  // Gender radiogroup: "all" + the three concrete genders, in DOM order.
  const genderOptions: (ProductGender | undefined)[] = [undefined, ...GENDERS];
  const genderIdx = genderOptions.findIndex((g) => g === filter.gender);

  function handleGenderKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const len = genderOptions.length;
    const current = genderIdx === -1 ? 0 : genderIdx;
    const forwardKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const backwardKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
    let next = -1;
    if (e.key === forwardKey || e.key === 'ArrowDown') {
      e.preventDefault();
      next = (current + 1) % len;
    } else if (e.key === backwardKey || e.key === 'ArrowUp') {
      e.preventDefault();
      next = (current - 1 + len) % len;
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      next = len - 1;
    }
    if (next !== -1) onGenderChange(genderOptions[next]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onPress={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="border border-divider/60 bg-content1 hover:bg-content2 text-default-700 dark:text-default-300 text-xs font-medium"
        >
          <span className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="size-3.5" aria-hidden />
            {open ? t('catalog.filters.hide') : t('catalog.filters.label')}
            {activeCount > 0 && !open ? (
              <span className="ms-0.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground leading-none">
                {activeCount}
              </span>
            ) : null}
          </span>
        </Button>
        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onPress={onClearAll}
            className="text-xs text-default-500 hover:text-danger"
          >
            <span className="inline-flex items-center gap-1">
              <X className="size-3" aria-hidden />
              {t('catalog.filters.clearAll')}
            </span>
          </Button>
        ) : null}
      </div>

      {open ? (
        <Accordion
          allowsMultipleExpanded
          defaultExpandedKeys={expandedKeys}
          className="rounded-large border border-divider/60 bg-content1"
        >
          <Accordion.Item id="gender">
            <Accordion.Heading>
              <Accordion.Trigger>{t('catalog.filters.genderLabel')}</Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="pt-0">
                <div
                  className="flex flex-wrap gap-1.5"
                  role="radiogroup"
                  aria-label={t('catalog.filters.genderLabel')}
                  onKeyDown={handleGenderKeyDown}
                >
                  <GenderPill
                    label={t('catalog.filters.allGenders')}
                    selected={filter.gender === undefined}
                    tabIndex={genderIdx === 0 ? 0 : (genderIdx === -1 ? 0 : -1)}
                    onClick={() => onGenderChange(undefined)}
                  />
                  {GENDERS.map((g, i) => {
                    const isSel = filter.gender === g;
                    return (
                      <GenderPill
                        key={g}
                        label={t(genderTranslationKey(g))}
                        selected={isSel}
                        tabIndex={genderIdx === i + 1 ? 0 : -1}
                        onClick={() => onGenderChange(filter.gender === g ? undefined : g)}
                      />
                    );
                  })}
                </div>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item id="size">
            <Accordion.Heading>
              <Accordion.Trigger>{t('catalog.filters.sizeLabel')}</Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="pt-0">
                <DebouncedInput
                  label={t('catalog.filters.sizeLabel')}
                  value={filter.size ?? ''}
                  onCommit={onSizeChange}
                  placeholder={t('catalog.filters.sizePlaceholder')}
                />
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item id="color">
            <Accordion.Heading>
              <Accordion.Trigger>{t('catalog.filters.colorLabel')}</Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="pt-0">
                <DebouncedInput
                  label={t('catalog.filters.colorLabel')}
                  value={filter.color ?? ''}
                  onCommit={onColorChange}
                  placeholder={t('catalog.filters.colorPlaceholder')}
                />
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item id="price">
            <Accordion.Heading>
              <Accordion.Trigger>
                {t('catalog.filters.minPriceLabel')} / {t('catalog.filters.maxPriceLabel')}
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="pt-0">
                <div className="flex items-end gap-2">
                  <DebouncedInput
                    hideLabel
                    label={t('catalog.filters.minPriceLabel')}
                    value={filter.minPrice !== undefined ? String(filter.minPrice) : ''}
                    onCommit={onMinPriceChange}
                    placeholder={t('catalog.filters.minPriceLabel')}
                    type="number"
                    min="0"
                    className="flex-1"
                  />
                  {/* eslint-disable-next-line i18next/no-literal-string -- decorative en dash, same glyph in all locales */}
                  <span className="pb-2 text-default-400" aria-hidden>–</span>
                  <DebouncedInput
                    hideLabel
                    label={t('catalog.filters.maxPriceLabel')}
                    value={filter.maxPrice !== undefined ? String(filter.maxPrice) : ''}
                    onCommit={onMaxPriceChange}
                    placeholder={t('catalog.filters.maxPriceLabel')}
                    type="number"
                    min="0"
                    className="flex-1"
                  />
                </div>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      ) : null}
    </div>
  );
}

function GenderPill({
  label,
  selected,
  onClick,
  tabIndex,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  tabIndex: number;
}) {
  return (
    // intentional: raw <button role="radio"> keeps the RAC radiogroup pattern per DESIGN.md.
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      onClick={onClick}
      className={
        selected
          ? 'rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
          : 'rounded-md border border-divider/60 bg-content2 px-3 py-1 text-xs font-medium text-default-700 transition-colors hover:bg-content2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-default-300'
      }
    >
      {label}
    </button>
  );
}

interface DebouncedInputProps {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  debounceMs?: number;
  className?: string;
  placeholder?: string;
  type?: string;
  min?: string;
  /** Visually hide the label (still announced to assistive tech). */
  hideLabel?: boolean;
}

function DebouncedInput({
  label,
  value,
  onCommit,
  debounceMs = 400,
  className,
  placeholder,
  type,
  min,
  hideLabel,
}: DebouncedInputProps) {
  const [draft, setDraft] = useState(value);

  // Sync external resets (e.g. clear-all sets filter.size to undefined, value='').
  useEffect(() => {
    const h = window.setTimeout(() => setDraft(value), 0);
    return () => window.clearTimeout(h);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const h = window.setTimeout(() => onCommit(draft), debounceMs);
    return () => clearTimeout(h);
  }, [draft, value, onCommit, debounceMs]);

  return (
    <TextField className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <Label className={hideLabel ? 'sr-only' : 'text-xs font-medium text-default-500'}>
        {label}
      </Label>
      <Input
        type={type}
        value={draft}
        onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        min={min}
      />
    </TextField>
  );
}
