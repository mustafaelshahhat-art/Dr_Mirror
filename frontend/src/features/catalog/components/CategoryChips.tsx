import { useTranslation } from 'react-i18next';

import type { CategoryDto } from '../types';

interface CategoryChipsProps {
  categories: CategoryDto[];
  selectedId: string | undefined;
  onSelect: (categoryId: string | undefined) => void;
}

/**
 * Horizontal scrollable pill row, doubles as the catalog category filter.
 * Single-select; "All" deselects. Uses logical CSS so it flips correctly in RTL.
 */
export function CategoryChips({ categories, selectedId, onSelect }: CategoryChipsProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');

  return (
    <div
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label={t('catalog.filters.categoryLabel')}
    >
      <Pill selected={!selectedId} onClick={() => onSelect(undefined)}>
        {t('catalog.filters.all')}
      </Pill>
      {categories.map((c) => (
        <Pill
          key={c.id}
          selected={c.id === selectedId}
          onClick={() => onSelect(c.id === selectedId ? undefined : c.id)}
        >
          {isAr ? c.nameAr : c.nameEn}
        </Pill>
      ))}
    </div>
  );
}

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={
        selected
          ? 'shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors'
          : 'shrink-0 rounded-full border border-divider/60 bg-content1 px-3 py-1.5 text-xs font-medium text-default-700 transition-colors hover:border-default-400 hover:text-foreground dark:text-default-300'
      }
    >
      {children}
    </button>
  );
}
