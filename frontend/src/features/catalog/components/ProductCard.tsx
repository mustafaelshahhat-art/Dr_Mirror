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
      <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-medium dark:hover:shadow-none">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-bone">
          {product.primaryImageUrl ? (
            <img
              src={product.primaryImageUrl}
              alt={name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-default-300 dark:text-default-600">
              <Package className="size-12" aria-hidden />
            </div>
          )}
          {isSoldOut ? (
            <span className="absolute top-2 start-2 inline-flex items-center rounded-medium bg-foreground/85 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-background">
              {t('catalog.list.soldOut')}
            </span>
          ) : null}
        </div>

        <Card.Content className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-wide text-default-500">{categoryName}</span>
            <GenderChip gender={product.gender} />
          </div>

          <h3 className="line-clamp-2 text-base font-medium leading-snug text-foreground">
            {name}
          </h3>

          {product.brand ? (
            <span className="text-xs text-default-500">{product.brand}</span>
          ) : null}

          {product.availableColors.length > 0 ? (
            <ColorSwatchRow colors={product.availableColors} />
          ) : null}

          <div className="mt-auto grid grid-cols-1 gap-1 pt-2 @md:grid-cols-2 @md:items-center @md:gap-2">
            <span className="text-base font-semibold tabular-nums text-foreground">
              {formatCurrency(product.price, lang)}
            </span>
            {sizeCount > 0 ? (
              <span className="text-xs text-default-500 tabular-nums @md:text-end">
                {t('catalog.list.sizesAvailable', { count: sizeCount })}
              </span>
            ) : null}
          </div>
        </Card.Content>
      </Card>
    </Link>
  );
}
