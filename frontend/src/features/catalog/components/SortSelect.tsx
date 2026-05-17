import { useTranslation } from 'react-i18next';

import { SelectField } from '../../../shared/components/SelectField';
import type { ProductSort } from '../types';

const OPTIONS: ProductSort[] = ['Newest', 'PriceAsc', 'PriceDesc', 'NameAsc'];

/**
 * HeroUI Select for product sorting. The HeroUI Select inherits direction from
 * the I18nProvider so the popover and caret flip automatically in Arabic.
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
    <SelectField
      label={t('catalog.sort.label')}
      value={value}
      onChange={(v) => {
        if (!v) return;
        onChange(v as ProductSort);
      }}
      options={OPTIONS.map((opt) => ({ value: opt, label: t(`catalog.sort.${opt}`) }))}
      className="min-w-[12rem]"
    />
  );
}
