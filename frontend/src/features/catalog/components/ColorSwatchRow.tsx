import { useTranslation } from 'react-i18next';

import type { ColorOption } from '../types';

interface ColorSwatchRowProps {
  colors: ColorOption[];
  /** Cap how many swatches to render before showing a "+N" pill. Default 5. */
  maxVisible?: number;
  size?: 'sm' | 'md';
}

/**
 * Read-only horizontal row of colour swatches for product cards. Pure
 * presentation — interaction lives on the detail page (`ColorPicker`).
 */
export function ColorSwatchRow({
  colors,
  maxVisible = 5,
  size = 'sm',
}: ColorSwatchRowProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const visible = colors.slice(0, maxVisible);
  const overflow = colors.length - visible.length;

  if (colors.length === 0) {
    return null;
  }

  const dotSize = size === 'md' ? 'size-5' : 'size-4';

  return (
    <div className="flex items-center gap-1" aria-label={t('catalog.detail.availableColors')}>
      {visible.map((c) => (
        <span
          key={c.name}
          title={isAr ? c.nameAr : c.name}
          className={`${dotSize} inline-block rounded-full border border-divider/60 ring-1 ring-inset ring-black/5`}
          style={{ backgroundColor: c.hex }}
          aria-label={isAr ? c.nameAr : c.name}
        />
      ))}
      {overflow > 0 ? (
        <span className="ms-1 text-[11px] font-medium tabular-nums text-default-500">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
