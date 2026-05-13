import { useTranslation } from 'react-i18next';

import { genderTranslationKey } from '../hooks';
import type { ProductGender } from '../types';

const CLASS_BY_GENDER: Record<ProductGender, string> = {
  // Men: cool blue undertone
  0: 'bg-primary/10 text-primary-700 dark:text-primary-400 border-primary/30',
  // Women: warm pink undertone
  1: 'bg-secondary/10 text-secondary-700 dark:text-secondary-400 border-secondary/30',
  // Unisex: neutral grey — keeps the page from feeling like a "boys vs girls" UI
  2: 'bg-default/30 text-default-700 dark:text-default-400 border-default/40',
};

/**
 * Small label badge for a product's target audience: Men / Women / Unisex.
 * Subtle hue per state — never the loudest thing on the card.
 */
export function GenderChip({ gender }: { gender: ProductGender }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center rounded-medium border px-2 py-0.5 text-xs font-medium ${CLASS_BY_GENDER[gender] ?? CLASS_BY_GENDER[2]}`}
    >
      {t(genderTranslationKey(gender))}
    </span>
  );
}
