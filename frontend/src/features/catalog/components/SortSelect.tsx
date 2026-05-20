import { useTranslation } from 'react-i18next';

import { SelectField } from '../../../shared/components/SelectField';
import type { ProductSort } from '../types';

const OPTIONS: ProductSort[] = ['Newest', 'PriceAsc', 'PriceDesc', 'NameAsc'];

/**
 * HeroUI Select for product sorting. The HeroUI Select inherits direction from
 * the I18nProvider so the popover and caret flip automatically in Arabic.
 *
 * Fixed w-44 keeps the control from ballooning on wide viewports.
 * The visible label is hidden (hideLabel) so the sort row stays single-line
 * and vertically aligned with the search input; the label is still announced
 * to assistive technology via the SelectField's sr-only Label element.
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
      hideLabel
      isFilter
      value={value}
      onChange={(v) => {
        if (!v) return;
        onChange(v as ProductSort);
      }}
      options={OPTIONS.map((opt) => ({ value: opt, label: t(`catalog.sort.${opt}`) }))}
      className="w-full sm:w-44 shrink-0"
    />
  );
}
