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
  const { t } = useTranslation();
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-medium border border-divider/60 bg-content1 px-3 py-1.5 text-xs font-medium text-default-700 transition-colors hover:bg-content2 dark:text-default-300"
          aria-expanded={open}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          {open ? t('catalog.filters.hide') : t('catalog.filters.label')}
          {activeCount > 0 && !open ? (
            <span className="ms-0.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground leading-none">
              {activeCount}
            </span>
          ) : null}
        </button>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 text-xs text-default-500 hover:text-danger"
          >
            <X className="size-3" aria-hidden />
            {t('catalog.filters.clearAll')}
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Gender */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-default-500">{t('catalog.filters.genderLabel')}</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('catalog.filters.genderLabel')}>
                <GenderPill
                  label={t('catalog.filters.allGenders')}
                  selected={filter.gender === undefined}
                  onClick={() => onGenderChange(undefined)}
                />
                {GENDERS.map((g) => (
                  <GenderPill
                    key={g}
                    label={t(genderTranslationKey(g))}
                    selected={filter.gender === g}
                    onClick={() => onGenderChange(filter.gender === g ? undefined : g)}
                  />
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-default-500" htmlFor="filter-size">
                {t('catalog.filters.sizeLabel')}
              </label>
              <DebouncedInput
                id="filter-size"
                value={filter.size ?? ''}
                onCommit={onSizeChange}
                placeholder={t('catalog.filters.sizePlaceholder')}
              />
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-default-500" htmlFor="filter-color">
                {t('catalog.filters.colorLabel')}
              </label>
              <DebouncedInput
                id="filter-color"
                value={filter.color ?? ''}
                onCommit={onColorChange}
                placeholder={t('catalog.filters.colorPlaceholder')}
              />
            </div>

            {/* Price range */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-default-500">
                {t('catalog.filters.minPriceLabel')} / {t('catalog.filters.maxPriceLabel')}
              </p>
              <div className="flex items-center gap-2">
                <DebouncedInput
                  id="filter-min-price"
                  value={filter.minPrice !== undefined ? String(filter.minPrice) : ''}
                  onCommit={onMinPriceChange}
                  placeholder={t('catalog.filters.minPriceLabel')}
                  type="number"
                  min="0"
                  className="w-full"
                />
                <span className="text-default-400">–</span>
                <DebouncedInput
                  id="filter-max-price"
                  value={filter.maxPrice !== undefined ? String(filter.maxPrice) : ''}
                  onCommit={onMaxPriceChange}
                  placeholder={t('catalog.filters.maxPriceLabel')}
                  type="number"
                  min="0"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GenderPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={
        selected
          ? 'rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors'
          : 'rounded-full border border-divider/60 bg-content2 px-3 py-1 text-xs font-medium text-default-700 transition-colors hover:bg-content2 dark:text-default-300'
      }
    >
      {label}
    </button>
  );
}

function DebouncedInput({
  value,
  onCommit,
  debounceMs = 400,
  className,
  ...rest
}: {
  value: string;
  onCommit: (v: string) => void;
  debounceMs?: number;
  className?: string;
  id?: string;
  placeholder?: string;
  type?: string;
  min?: string;
}) {
  const [draft, setDraft] = useState(value);

  // Sync external resets (e.g. clear-all sets filter.size to undefined → value='')
  useEffect(() => { setDraft(value); }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const h = window.setTimeout(() => onCommit(draft), debounceMs);
    return () => clearTimeout(h);
  }, [draft, value, onCommit, debounceMs]);

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      className={`rounded-medium border border-divider/60 bg-content1 px-3 py-1.5 text-sm text-foreground placeholder:text-default-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${className ?? 'w-full'}`}
      {...rest}
    />
  );
}
