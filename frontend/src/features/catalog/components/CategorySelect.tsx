import { useTranslation } from 'react-i18next';

import { SelectField } from '../../../shared/components/SelectField';
import type { CategoryDto } from '../types';

interface CategorySelectProps {
  categories: CategoryDto[];
  selectedId: string | undefined;
  onSelect: (categoryId: string | undefined) => void;
}

export function CategorySelect({
  categories,
  selectedId,
  onSelect,
}: CategorySelectProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');

  const options = [
    { value: 'all', label: t('catalog.filters.all') },
    ...categories.map((c) => ({
      value: c.id,
      label: isAr ? c.nameAr : c.nameEn,
    })),
  ];

  return (
    <SelectField
      label={t('catalog.filters.categoryLabel')}
      hideLabel
      isFilter
      value={selectedId || 'all'}
      onChange={(v) => {
        onSelect(v === 'all' ? undefined : v);
      }}
      options={options}
      className="w-full sm:w-44 shrink-0"
    />
  );
}
