import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { genderTranslationKey } from '../hooks';
import type { ProductGender } from '../types';

type ChipColor = 'accent' | 'default' | 'success';

/**
 * Gender badge on product cards and the detail page.
 *
 * Distinct colors provide at-a-glance differentiation:
 *   0 = Men    → default (neutral)
 *   1 = Women  → accent (brand purple)
 *   2 = Unisex → success (green — communicates "fits all")
 */
const COLOR_BY_GENDER: Record<ProductGender, ChipColor> = {
  0: 'default',
  1: 'accent',
  2: 'success',
};

export function GenderChip({ gender }: { gender: ProductGender }) {
  const { t } = useTranslation();
  return (
    <Chip color={COLOR_BY_GENDER[gender] ?? 'default'} variant="soft" size="sm">
      <Chip.Label>{t(genderTranslationKey(gender))}</Chip.Label>
    </Chip>
  );
}
