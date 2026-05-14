import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { GOVERNORATE_SLUGS } from '../types';

interface GovernorateSelectProps {
  value: string;
  onChange: (slug: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

/**
 * Native select populated with the 27 canonical Egyptian governorate slugs.
 * Display labels read from <c>governorates.&lt;slug&gt;</c> in the active
 * locale; options are sorted alphabetically by the localized label so the
 * order is stable in both en (Latin) and ar (Arabic) environments.
 */
export function GovernorateSelect({
  value,
  onChange,
  required,
  disabled,
  id,
  name,
}: GovernorateSelectProps) {
  const { t, i18n } = useTranslation();

  const options = useMemo(() => {
    const collator = new Intl.Collator(i18n.language?.startsWith('ar') ? 'ar' : 'en');
    return [...GOVERNORATE_SLUGS]
      .map((slug) => ({ slug, label: t(`governorates.${slug}`) }))
      .sort((a, b) => collator.compare(a.label, b.label));
  }, [i18n.language, t]);

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      className="w-full rounded-medium border border-divider bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="" disabled>
        {t('governorates.selectPlaceholder')}
      </option>
      {options.map(({ slug, label }) => (
        <option key={slug} value={slug}>
          {label}
        </option>
      ))}
    </select>
  );
}
