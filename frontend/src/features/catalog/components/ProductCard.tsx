import { Card } from '@heroui/react';
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
 * URL is the canonical reference. Shows the brand, price, gender chip,
 * available colour swatches, and the count of available sizes.
 *
 * Long names line-clamped at 2; price line uses tabular-nums so a column
 * of cards aligns vertically.
 *
 * Navigable card pattern (per data-model.md Anatomy A.1):
 * `<Link>` (react-router-dom) wraps the `<Card>` to provide the navigable
 * surface, focus ring, and keyboard activation. The HeroUI v3 `Card`
 * compound owns the visual chrome (border/radius/surface tokens) so theme
 * tokens propagate.
 *
 * Deviation note (recorded for the PR audit): the spec option (a)
 * `<Button as={Link} variant="ghost">` does not typecheck against the v3
 * Button typed declaration (no polymorphic `as` prop in the declared
 * `ButtonRootProps`); option (b) `Card.Header as={Link}` does not
 * typecheck either (Card.* parts accept `as: keyof JSX.IntrinsicElements`,
 * not arbitrary components). Wrapping `Card` in `<Link>` preserves URL,
 * `aria-label`, keyboard activation, and react-router navigation — the
 * outcomes the spec mandates. No v2 pressable-card prop is used.
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
      <Card className="flex h-full flex-col overflow-hidden border border-divider/50 transition-all duration-200 hover:border-divider hover:shadow-medium dark:hover:shadow-none">
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
        </div>

        <Card.Content className="flex flex-1 flex-col gap-2.5 p-3 sm:p-4">
          {/* Category + gender row */}
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs uppercase tracking-wider text-muted">{categoryName}</span>
            <GenderChip gender={product.gender} />
          </div>

          {/* Product name */}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-base">
            {name}
          </h3>

          {product.brand ? (
            <span className="text-xs text-muted">{product.brand}</span>
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
              <span className="text-xs tabular-nums text-muted @md:text-end">
                {t('catalog.list.sizesAvailable', { count: sizeCount })}
              </span>
            ) : null}
          </div>
        </Card.Content>
      </Card>
    </Link>
  );
}
