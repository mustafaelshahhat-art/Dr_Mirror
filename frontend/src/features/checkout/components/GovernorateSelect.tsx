import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { SelectField } from '../../../shared/components/SelectField';
import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';
import { useGovernoratesQuery } from '../hooks';
import type { GovernorateDto } from '../types';

interface Props {
  value: string;
  onChange: (slug: string, governorate: GovernorateDto | null) => void;
  lang: AppLang;
  errorMessage?: string | null;
}

export function GovernorateSelect({ value, onChange, lang, errorMessage }: Props) {
  const { t, i18n } = useTranslation();
  const query = useGovernoratesQuery();

  const governorates = useMemo(() => query.data ?? [], [query.data]);
  const options = useMemo(() => {
    const collator = new Intl.Collator(i18n.language?.startsWith('ar') ? 'ar' : 'en');
    return [...governorates]
      .sort((a, b) => collator.compare(lang === 'ar' ? a.nameAr : a.nameEn, lang === 'ar' ? b.nameAr : b.nameEn))
      .map((governorate) => ({
        value: governorate.slug,
        label: `${lang === 'ar' ? governorate.nameAr : governorate.nameEn} · ${formatCurrency(governorate.fee, lang, governorate.currency)}`,
      }));
  }, [governorates, i18n.language, lang]);

  return (
    <SelectField
      label={t('shipping.governorate.label')}
      value={value}
      onChange={(slug) => onChange(slug, governorates.find((g) => g.slug === slug) ?? null)}
      options={options}
      placeholder={query.isLoading ? t('shipping.governorate.loading') : t('shipping.governorate.placeholder')}
      description={query.isSuccess && governorates.length === 0 ? t('shipping.governorate.empty') : undefined}
      isRequired
      errorMessage={errorMessage}
    />
  );
}
