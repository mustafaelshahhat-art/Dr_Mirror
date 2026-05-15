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
      className="group flex flex-col overflow-hidden rounded-large border border-divider/60 bg-content1 transition-shadow hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-default-100">
        {product.primaryImageUrl ? (
          <img
            src={product.primaryImageUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-default-400">—</div>
        )}
        {isSoldOut ? (
          <span className="absolute top-2 start-2 inline-flex items-center rounded-medium bg-foreground/85 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-background">
            {t('catalog.list.soldOut')}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wide text-default-500">{categoryName}</span>
          <GenderChip gender={product.gender} />
        </div>

        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {name}
        </h3>

        {product.brand ? (
          <span className="text-xs text-default-500">{product.brand}</span>
        ) : null}

        {product.availableColors.length > 0 ? (
          <ColorSwatchRow colors={product.availableColors} />
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-base font-semibold tabular-nums text-foreground">
            {formatCurrency(product.price, lang)}
          </span>
          {sizeCount > 0 ? (
            <span className="text-xs text-default-500 tabular-nums">
              {t('catalog.list.sizesAvailable', { count: sizeCount })}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
