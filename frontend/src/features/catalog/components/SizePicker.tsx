import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProductVariantDto } from '../types';

interface SizePickerProps {
  /** Sizes available for the currently-selected colour. */
  sizes: string[];
  /** Variant rows scoped to the current colour, used to read per-size stock. */
  variantsForColor: ProductVariantDto[];
  selected: string | null;
  onSelect: (size: string) => void;
}

/**
 * Button row of sizes scoped to the active colour. Out-of-stock sizes are
 * still rendered (so the user can see the size system), but disabled.
 */
export function SizePicker({
  sizes,
  variantsForColor,
  selected,
  onSelect,
}: SizePickerProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const stockMap = new Map<string, number>();
  for (const v of variantsForColor) stockMap.set(v.size, v.stock);

  const availableSizes = sizes.filter((s) => (stockMap.get(s) ?? 0) > 0);
  const firstAvailableIdx = sizes.findIndex((s) => (stockMap.get(s) ?? 0) > 0);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const len = availableSizes.length;
    if (len === 0) return;
    const currentAvailIdx = availableSizes.findIndex((s) => s === selected);
    const current = currentAvailIdx === -1 ? 0 : currentAvailIdx;
    // Direction-aware horizontal arrows: in RTL the visual "next" sizes sits
    // to the left, so ArrowLeft must advance.
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
    if (next !== -1) onSelect(availableSizes[next]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{t('catalog.detail.sizeLabel')}</span>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label={t('catalog.detail.sizeLabel')}
        onKeyDown={handleKeyDown}
      >
        {sizes.map((s, idx) => {
          const stock = stockMap.get(s) ?? 0;
          const isSelected = s === selected;
          const isOut = stock <= 0;
          const tabIdx = isOut
            ? -1
            : isSelected
              ? 0
              : selected === null && idx === firstAvailableIdx
                ? 0
                : -1;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={t('catalog.detail.sizeAria', { size: s })}
              disabled={isOut}
              tabIndex={tabIdx}
              onClick={() => onSelect(s)}
              className={
                isOut
                  ? 'inline-flex min-w-12 cursor-not-allowed items-center justify-center rounded-medium border border-divider/40 bg-default-100/40 px-3 py-1.5 text-sm text-default-400 line-through'
                  : isSelected
                    ? 'inline-flex min-w-12 items-center justify-center rounded-medium border-2 border-foreground bg-content1 px-3 py-1.5 text-sm font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                    : 'inline-flex min-w-12 items-center justify-center rounded-medium border border-divider/60 bg-content1 px-3 py-1.5 text-sm text-default-700 transition-colors hover:border-default-400 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-default-300'
              }
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
