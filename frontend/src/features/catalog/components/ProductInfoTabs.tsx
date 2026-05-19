import { useTranslation } from 'react-i18next';

interface ProductInfoTabsProps {
  description: string;
  brand?: string | null;
  material?: string | null;
  /** SKU to show: caller resolves variant vs. style-level SKU. */
  sku?: string | null;
  /** Pre-formatted availability string built by the caller. */
  availability: string;
}

/**
 * Extracts the product description + specs sections from ProductDetailPage
 * into a single focused component.
 *
 * Phase 4 brief note (T050): HeroUI v3 Tabs adoption was evaluated here but
 * deferred because no tab-label i18n keys exist in `catalog.detail` and the
 * brief forbids minting new keys during Phase 4. The stacked layout is the
 * approved fallback; a Tabs uplift can be scheduled once keys are added.
 */
export function ProductInfoTabs({
  description,
  brand,
  material,
  sku,
  availability,
}: ProductInfoTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <dl className="content-surface grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-3">
        {brand ? <SpecField label={t('catalog.detail.brand')} value={brand} /> : null}
        {material ? <SpecField label={t('catalog.detail.material')} value={material} /> : null}
        {sku ? <SpecField label={t('catalog.detail.skuVariant')} value={sku} /> : null}
        <SpecField label={t('catalog.detail.availability')} value={availability} />
      </dl>

      <p className="whitespace-pre-line text-sm leading-relaxed text-default-700 dark:text-default-300">
        {description}
      </p>
    </div>
  );
}

function SpecField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-default-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
