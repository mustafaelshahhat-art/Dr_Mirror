import type { KeyboardEvent } from 'react';
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

  // Build flat list: "all" at index 0, then categories.
  const allIds: (string | undefined)[] = [undefined, ...categories.map((c) => c.id)];
  const selectedTabIdx = selectedId ? allIds.indexOf(selectedId) : 0;
  const isRtl = i18n.dir() === 'rtl';

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const len = allIds.length;
    if (len === 0) return;
    const current = selectedTabIdx === -1 ? 0 : selectedTabIdx;
    // In RTL the visual "next" pill sits to the LEFT of the current one, so
    // ArrowLeft must advance and ArrowRight must retreat. ArrowDown/ArrowUp
    // stay direction-agnostic (logical: next/previous in DOM order).
    const forwardKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const backwardKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
    let next = -1;
    if (e.key === forwardKey || e.key === 'ArrowDown') {
      e.preventDefault();
      next = (current + 1) % len;
    } else if (e.key === backwardKey || e.key === 'ArrowUp') {
      e.preventDefault();
      next = (current - 1 + len) % len;
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      next = len - 1;
    }
    if (next !== -1) onSelect(allIds[next]);
  }

  return (
    <div
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="radiogroup"
      aria-label={t('catalog.filters.categoryLabel')}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <Pill selected={!selectedId} tabIndex={!selectedId ? 0 : -1} onClick={() => onSelect(undefined)}>
        {t('catalog.filters.all')}
      </Pill>
      {categories.map((c) => (
        <Pill
          key={c.id}
          selected={c.id === selectedId}
          tabIndex={c.id === selectedId ? 0 : -1}
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
  tabIndex,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  tabIndex: number;
  children: React.ReactNode;
}) {
  return (
    // intentional: raw <button role="radio"> keeps the RAC radiogroup pattern per DESIGN.md.
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      onClick={onClick}
      className={
        selected
          ? 'shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
          : 'shrink-0 rounded-md border border-divider/60 bg-content1 px-3 py-1.5 text-xs font-medium text-default-700 transition-colors hover:border-default-400 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-default-300'
      }
    >
      {children}
    </button>
  );
}
