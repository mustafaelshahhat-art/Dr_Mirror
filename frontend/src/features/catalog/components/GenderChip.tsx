import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { genderTranslationKey } from '../hooks';
import type { ProductGender } from '../types';

type ChipColor = 'accent' | 'default';

const COLOR_BY_GENDER: Record<ProductGender, ChipColor> = {
  0: 'accent',
  1: 'accent',
  2: 'default',
};

export function GenderChip({ gender }: { gender: ProductGender }) {
  const { t } = useTranslation();
  return (
    <Chip color={COLOR_BY_GENDER[gender] ?? 'default'} variant="soft" size="sm">
      <Chip.Label>{t(genderTranslationKey(gender))}</Chip.Label>
    </Chip>
  );
}
