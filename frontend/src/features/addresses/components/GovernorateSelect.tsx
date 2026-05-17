import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { SelectField } from '../../../shared/components/SelectField';
import { GOVERNORATE_SLUGS } from '../types';

interface GovernorateSelectProps {
  value: string;
  onChange: (slug: string) => void;
  required?: boolean;
  hideLabel?: boolean;
  /** Defaults to <c>checkout.address.governorate</c>; pass a custom key for
   *  the address-book context. */
  label?: string;
}

/**
 * HeroUI Select populated with the 27 canonical Egyptian governorate slugs.
 * Display labels read from <c>governorates.&lt;slug&gt;</c> in the active
 * locale; options are sorted alphabetically by the localized label so the
 * order is stable in both en (Latin) and ar (Arabic) environments. The
 * underlying HeroUI Select is direction-aware via I18nProvider.
 */
export function GovernorateSelect({
  value,
  onChange,
  required,
  hideLabel,
  label,
}: GovernorateSelectProps) {
  const { t, i18n } = useTranslation();

  const options = useMemo(() => {
    const collator = new Intl.Collator(i18n.language?.startsWith('ar') ? 'ar' : 'en');
    return [...GOVERNORATE_SLUGS]
      .map((slug) => ({ slug, label: t(`governorates.${slug}`) }))
      .sort((a, b) => collator.compare(a.label, b.label))
      .map(({ slug, label }) => ({ value: slug, label }));
  }, [i18n.language, t]);

  return (
    <SelectField
      label={label ?? t('checkout.address.governorate')}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={t('governorates.selectPlaceholder')}
      isRequired={required}
      hideLabel={hideLabel}
    />
  );
}
