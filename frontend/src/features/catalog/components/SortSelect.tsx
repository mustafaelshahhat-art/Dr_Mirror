import { useTranslation } from 'react-i18next';

import type { ProductSort } from '../types';

const OPTIONS: ProductSort[] = ['Newest', 'PriceAsc', 'PriceDesc', 'NameAsc'];

/**
 * Native select for sort. Native renders correctly in RTL out of the box
 * (caret position, popup direction) and avoids portal/positioning bugs we'd
 * have to chase with custom dropdowns.
 */
export function SortSelect({
  value,
  onChange,
}: {
  value: ProductSort;
  onChange: (next: ProductSort) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-default-500">{t('catalog.sort.label')}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProductSort)}
        className="rounded-medium border border-divider/60 bg-content1 px-3 py-2 text-sm text-foreground transition-colors hover:border-default-400 focus:border-primary focus:outline-none"
        aria-label={t('catalog.sort.label')}
      >
        {OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {t(`catalog.sort.${opt}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
