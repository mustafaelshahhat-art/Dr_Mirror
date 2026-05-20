import { Button, Label, NumberField, Tooltip } from '@heroui/react';
import { ImageOff, Minus, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';
import type { CartItemDto } from '../types';
import { MAX_QUANTITY_PER_LINE } from '../types';

interface CartLineRowProps {
  line: CartItemDto;
  onUpdate: (next: number) => void;
  onRemove: () => void;
  isMutating: boolean;
  /** Compact layout used inside the mini-cart drawer; default is the /cart page. */
  variant?: 'compact' | 'page';
}

/**
 * One row in the cart: image, name, color + size, quantity stepper, line
 * total, remove button. Works for both the drawer and the full /cart page;
 * the <c>variant</c> prop only tweaks spacing / image size.
 */
export function CartLineRow({
  line,
  onUpdate,
  onRemove,
  isMutating,
  variant = 'page',
}: CartLineRowProps) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';
  const name = isAr ? line.nameAr : line.nameEn;
  const colorName = isAr ? line.colorNameAr : line.colorName;
  const isCompact = variant === 'compact';

  const isUnavailable = !line.isAvailable;
  const maxQuantity = Math.min(MAX_QUANTITY_PER_LINE, line.variantStock);

  return (
    <div
      className={[
        'cq flex flex-col gap-3 @sm:flex-row',
        isCompact
          ? 'rounded-2xl border border-divider/60 bg-content1 p-3'
          : '',
        isUnavailable ? 'opacity-60' : '',
      ].join(' ')}
    >
      <Link
        to={`/products/${line.productSlug}`}
        className={[
          isCompact ? 'size-16 rounded-xl' : 'h-24 w-20 rounded-2xl',
          'shrink-0 overflow-hidden bg-bone',
        ].join(' ')}
      >
        {line.primaryImageUrl ? (
          <img
            src={line.primaryImageUrl}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-default-400"
            role="img"
            aria-label={t('catalog.detail.noImage')}
          >
            <ImageOff className="size-6" aria-hidden />
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-col gap-1 @sm:flex-row @sm:items-start @sm:justify-between @sm:gap-2">
          <Link
            to={`/products/${line.productSlug}`}
            className="line-clamp-2 text-sm font-medium leading-tight text-foreground hover:underline"
          >
            {name}
          </Link>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground @sm:text-end">
            {formatCurrency(line.lineTotal, lang)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-default-500">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-3 rounded-full ring-1 ring-default-200"
              style={{ backgroundColor: line.colorHex }}
              aria-hidden
            />
            {colorName}
          </span>
          <span aria-hidden>·</span>
          <span>
            {t('cart.line.sizeLabel')} {line.size}
          </span>
          {!isCompact ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono text-xs uppercase tracking-wide">{line.sku}</span>
            </>
          ) : null}
        </div>

        {isUnavailable ? (
          <p className="text-xs text-danger">{t('cart.line.unavailable')}</p>
        ) : null}

        <div className="mt-1 flex flex-col gap-2 @sm:flex-row @sm:items-center @sm:justify-between">
          <NumberField
            dir="ltr"
            value={line.quantity}
            minValue={1}
            maxValue={maxQuantity}
            step={1}
            isDisabled={isMutating || isUnavailable}
            onChange={(next) => {
              if (Number.isFinite(next) && next !== line.quantity) onUpdate(next);
            }}
            variant="secondary"
            className="w-full @sm:w-28"
            aria-label={t('cart.line.quantityLabel')}
          >
            <Label className="sr-only">{t('cart.line.quantityLabel')}</Label>
            <NumberField.Group>
              <NumberField.DecrementButton aria-label={t('cart.line.decreaseQuantity')}>
                <Minus className="size-3.5" aria-hidden />
              </NumberField.DecrementButton>
              <NumberField.Input className="tabular-nums" />
              <NumberField.IncrementButton aria-label={t('cart.line.increaseQuantity')}>
                <Plus className="size-3.5" aria-hidden />
              </NumberField.IncrementButton>
            </NumberField.Group>
          </NumberField>

          <Tooltip>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={onRemove}
              isDisabled={isMutating}
              aria-label={t('cart.line.remove')}
              className="text-default-500 hover:text-danger self-start @sm:self-auto"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
            <Tooltip.Content placement="top">{t('cart.line.remove')}</Tooltip.Content>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
