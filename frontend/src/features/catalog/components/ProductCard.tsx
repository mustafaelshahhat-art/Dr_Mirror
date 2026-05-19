import { Card } from '@heroui/react';
import { ArrowRight, Package } from 'lucide-react';
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

  return (
    <Link
      to={`/products/${product.slug}`}
      aria-label={name}
      className="cq-card group block h-full rounded-large focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="flex h-full flex-col overflow-hidden border border-divider/50 transition-all duration-200 hover:border-brand/30 hover:shadow-medium dark:hover:shadow-none">
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
            <div className="flex h-full w-full items-center justify-center text-default-300 dark:text-default-600">
              <Package className="size-10" aria-hidden />
            </div>
          )}
          {isSoldOut ? (
            <span className="absolute start-2 top-2 inline-flex items-center rounded-full bg-foreground/80 px-2.5 py-0.5 text-xs font-medium tracking-wide text-background backdrop-blur-sm">
              {t('catalog.list.soldOut')}
            </span>
          ) : null}
          {/* Desktop hover overlay — subtle brand tint with CTA */}
          <div className="pointer-events-none absolute inset-0 hidden items-end justify-end p-3 sm:flex">
            <span className="translate-y-1 rounded-full bg-brand/90 px-3 py-1 text-xs font-semibold text-white opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
              {t('catalog.list.viewDetails')}
            </span>
          </div>
        </div>

        <Card.Content className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          {/* Category + gender row */}
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs uppercase tracking-wider text-muted">{categoryName}</span>
            <GenderChip gender={product.gender} />
          </div>

          {/* Product name */}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-base">
            {name}
          </h3>

          {/* Brand — slightly more visible than muted */}
          {product.brand ? (
            <span className="text-xs font-medium text-default-600 dark:text-default-400">{product.brand}</span>
          ) : null}

          {product.availableColors.length > 0 ? (
            <ColorSwatchRow colors={product.availableColors} />
          ) : null}

          {/* Price + sizes — pinned to card bottom */}
          <div className="mt-auto grid grid-cols-1 gap-1 pt-2 @md:grid-cols-2 @md:items-center @md:gap-2">
            <span className="text-base font-bold tabular-nums text-foreground">
              {formatCurrency(product.price, lang)}
            </span>
            {sizeCount > 0 ? (
              <span className="text-xs font-medium tabular-nums text-default-600 dark:text-default-400 @md:text-end">
                {t('catalog.list.sizesAvailable', { count: sizeCount })}
              </span>
            ) : null}
          </div>

          {/* Mobile CTA — always visible; no hover on touch screens.
              Hidden on sm+ where the image overlay CTA is used instead. */}
          <div className="flex items-center justify-end gap-1 pt-1 sm:hidden">
            <span className="text-xs font-semibold text-brand">
              {t('catalog.list.viewDetails')}
            </span>
            <ArrowRight className="size-3 text-brand rtl:rotate-180" aria-hidden />
          </div>
        </Card.Content>
      </Card>
    </Link>
  );
}
