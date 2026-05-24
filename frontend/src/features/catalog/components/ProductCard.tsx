import { Chip, Card } from '@heroui/react';
import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';
import { useLocalizedField } from '../hooks';
import type { ProductSummaryDto } from '../types';

import { ColorSwatchRow } from './ColorSwatchRow';
import { GenderChip } from './GenderChip';

/**
 * One tile in the apparel catalog grid. Anchored on the product slug so the
 * URL is the canonical reference.
 *
 * CTA pattern: the entire card is a navigable Link, so keyboard and touch
 * users can activate it. A visible "View details →" hint is always shown
 * on mobile (no hover) and revealed on hover on desktop. No nested buttons
 * are used — the Link is the sole interactive element.
 *
 * Navigable card pattern (per data-model.md Anatomy A.1):
 * `<Link>` (react-router-dom) wraps the `<Card>` to provide the navigable
 * surface, focus ring, and keyboard activation.
 */
export function ProductCard({ product }: { product: ProductSummaryDto }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const name = useLocalizedField(product);
  const categoryName = useLocalizedField(product.category);
  const sizeCount = product.availableSizes.length;
  const isSoldOut = product.totalStock <= 0;
  const isLowStock = !isSoldOut && product.totalStock <= 5;

  type BadgeKey = 'soldOut' | 'lowStock' | null;
  const badge: BadgeKey = isSoldOut ? 'soldOut' : isLowStock ? 'lowStock' : null;

  return (
    <Link
      to={`/products/${product.slug}`}
      aria-label={name}
      className="cq-card group block h-full rounded-large focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="flex h-full flex-col overflow-hidden border border-divider/60 transition-all duration-200 hover:border-brand/40 hover:shadow-medium dark:hover:shadow-none">
        {/* Image container */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-secondary">
          {product.primaryImageUrl ? (
            <img
              src={product.primaryImageUrl}
              alt={name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-secondary text-default-300 dark:text-default-600">
              <Package className="size-10" aria-hidden />
              <span className="text-xs text-muted">{t('catalog.detail.noImage')}</span>
            </div>
          )}
          {badge ? (
            <div className="absolute end-2 top-2">
              <Chip
                color={badge === 'soldOut' ? 'default' : 'warning'}
                variant="soft"
                size="sm"
              >
                <Chip.Label>{t(`catalog.badge.${badge}`)}</Chip.Label>
              </Chip>
            </div>
          ) : null}
        </div>

        <Card.Content className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          {/* Category + gender row */}
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs uppercase tracking-wider text-muted">{categoryName}</span>
            <GenderChip gender={product.gender} />
          </div>

          {/* Product name */}
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground underline-offset-2 group-hover:underline sm:text-lg">
            {name}
          </h3>

          {product.availableColors.length > 0 ? (
            <ColorSwatchRow colors={product.availableColors} />
          ) : null}

          {/* Price + sizes — pinned to card bottom */}
          <div className="mt-auto grid grid-cols-1 gap-1 pt-2 @md:grid-cols-2 @md:items-center @md:gap-2">
            <span className="text-base font-bold tabular-nums text-foreground">
              {formatCurrency(product.price, lang)}
            </span>
            {sizeCount > 0 ? (
              <span className="text-xs font-medium tabular-nums text-default-600 dark:text-default-500 @md:text-end">
                {t('catalog.list.sizesAvailable', { count: sizeCount })}
              </span>
            ) : null}
          </div>

        </Card.Content>
      </Card>
    </Link>
  );
}
