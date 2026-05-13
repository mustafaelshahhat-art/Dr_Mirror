import { Button } from '@heroui/react';
import { Minus, Plus, Trash2 } from 'lucide-react';
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
 * One row in the cart — image, name, color + size, quantity stepper, line
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

  const canIncrement =
    line.quantity < MAX_QUANTITY_PER_LINE && line.quantity < line.variantStock;
  const canDecrement = line.quantity > 1;
  const isUnavailable = !line.isAvailable;

  return (
    <div
      className={[
        'flex gap-3 rounded-medium border border-divider/60 bg-content1 p-3',
        isUnavailable ? 'opacity-60' : '',
      ].join(' ')}
    >
      <Link
        to={`/products/${line.productSlug}`}
        className={[
          isCompact ? 'size-16' : 'size-20',
          'shrink-0 overflow-hidden rounded-medium bg-default-100',
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
          <div className="flex h-full w-full items-center justify-center text-default-400">
            —
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/products/${line.productSlug}`}
            className="line-clamp-2 text-sm font-medium leading-tight text-foreground hover:underline"
          >
            {name}
          </Link>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
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
              <span className="font-mono text-[11px] uppercase tracking-wide">{line.sku}</span>
            </>
          ) : null}
        </div>

        {isUnavailable ? (
          <p className="text-xs text-danger">{t('cart.line.unavailable')}</p>
        ) : null}

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center rounded-medium border border-divider/60">
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={() => onUpdate(line.quantity - 1)}
              isDisabled={!canDecrement || isMutating}
              aria-label={t('cart.line.decreaseQuantity')}
              className="rounded-e-none"
            >
              <Minus className="size-3.5" aria-hidden />
            </Button>
            <span
              className="min-w-8 px-1 text-center text-sm tabular-nums"
              aria-live="polite"
            >
              {line.quantity}
            </span>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={() => onUpdate(line.quantity + 1)}
              isDisabled={!canIncrement || isMutating}
              aria-label={t('cart.line.increaseQuantity')}
              className="rounded-s-none"
            >
              <Plus className="size-3.5" aria-hidden />
            </Button>
          </div>

          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onPress={onRemove}
            isDisabled={isMutating}
            aria-label={t('cart.line.remove')}
            className="text-default-500 hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
