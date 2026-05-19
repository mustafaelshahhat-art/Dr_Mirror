import { Tooltip } from '@heroui/react';
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
 *
 * Each swatch is wrapped in a HeroUI Tooltip so the colour name is accessible
 * on hover (desktop) and via screen-reader aria-label. Swatches are focusable
 * (tabIndex={0} + role="img") so keyboard users can also read colour names
 * through tooltip activation.
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

  // sm → 20px, md → 24px — both above the 16px minimum.
  const dotSize = size === 'md' ? 'size-6' : 'size-5';

  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={t('catalog.detail.availableColors')}
    >
      {visible.map((c) => {
        const colorName = isAr ? c.nameAr : c.name;
        return (
          <Tooltip key={c.name}>
            {/* tabIndex={0} + role="img" makes each swatch keyboard-reachable
                and correctly announced by screen readers as an image with a name. */}
            <span
              role="img"
              aria-label={colorName}
              tabIndex={0}
              className={`${dotSize} inline-block shrink-0 cursor-default rounded-full border border-divider/60 ring-1 ring-inset ring-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary`}
              style={{ backgroundColor: c.hex }}
            />
            <Tooltip.Content placement="top">{colorName}</Tooltip.Content>
          </Tooltip>
        );
      })}
      {overflow > 0 ? (
        <span className="ms-0.5 text-xs font-medium tabular-nums text-default-500">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
