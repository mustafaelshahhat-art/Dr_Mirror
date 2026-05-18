import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { ProductVariantDto } from '../types';
import type { KeyboardEvent } from 'react';

interface ColorPickerProps {
  /** One representative variant per distinct colour. */
  colors: ProductVariantDto[];
  selected: string | null;
  onSelect: (colorName: string) => void;
}

/**
 * Interactive colour swatches for the product detail page. Each swatch is a
 * keyboard-accessible button; the selected one shows a check overlay (white
 * on dark hexes, dark on light hexes via CSS color-mix-style luminance).
 */
export function ColorPicker({ colors, selected, onSelect }: ColorPickerProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const selectedColor = colors.find((c) => c.colorName === selected);
  const selectedLabel = selectedColor
    ? isAr
      ? selectedColor.colorNameAr
      : selectedColor.colorName
    : '';

  const selectedIdx = colors.findIndex((c) => c.colorName === selected);
  const isRtl = i18n.dir() === 'rtl';

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const len = colors.length;
    if (len === 0) return;
    const current = selectedIdx === -1 ? 0 : selectedIdx;
    // Direction-aware horizontal arrows: in RTL the visual "next" swatch sits
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
    if (next !== -1) onSelect(colors[next].colorName);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{t('catalog.detail.colorLabel')}</span>
        <span className="text-default-500">{selectedLabel}</span>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label={t('catalog.detail.colorLabel')}
        onKeyDown={handleKeyDown}
      >
        {colors.map((c, idx) => {
          const isSelected = c.colorName === selected;
          const onLight = isLightHex(c.colorHex);
          return (
            // intentional: raw <button role="radio"> keeps the RAC radiogroup pattern per DESIGN.md.
            <button
              key={c.colorName}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={isAr ? c.colorNameAr : c.colorName}
              title={isAr ? c.colorNameAr : c.colorName}
              tabIndex={selectedIdx === -1 ? (idx === 0 ? 0 : -1) : isSelected ? 0 : -1}
              onClick={() => onSelect(c.colorName)}
              className={
                isSelected
                  ? 'relative size-9 rounded-full border-2 border-foreground transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                  : 'relative size-9 rounded-full border border-divider/60 transition-transform hover:scale-105 hover:border-default-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
              }
              style={{ backgroundColor: c.colorHex }}
            >
              {isSelected ? (
                <Check
                  className={`absolute inset-0 m-auto size-4 ${onLight ? 'text-foreground' : 'text-background'}`}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Cheap relative-luminance check for a `#rrggbb` hex. Returns true if the
 * colour is light enough that a white check overlay would disappear.
 */
function isLightHex(hex: string): boolean {
  const trimmed = hex.replace('#', '');
  if (trimmed.length !== 6) return false;
  const r = parseInt(trimmed.slice(0, 2), 16);
  const g = parseInt(trimmed.slice(2, 4), 16);
  const b = parseInt(trimmed.slice(4, 6), 16);
  // Rec. 709 luma; threshold 0.6 picks up off-white blush tones.
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma > 0.6;
}
