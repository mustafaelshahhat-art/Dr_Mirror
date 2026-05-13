import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import type { AppLang } from '../lib/theme-storage';

/**
 * Language switcher — shows the OTHER language as the button label so the
 * user understands what clicking will do (e.g. "EN" while currently Arabic).
 *
 * The button text is intentionally Latin/Arabic short-form, never an icon
 * alone: per DESIGN_PRINCIPLES §9, primary actions must not rely on icons
 * for meaning.
 */
export function LangSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'ar') as AppLang;
  const next: AppLang = current === 'ar' ? 'en' : 'ar';

  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={() => void i18n.changeLanguage(next)}
      aria-label={t('header.switchLanguage')}
      className="font-medium"
    >
      {next === 'en' ? 'EN' : 'العربية'}
    </Button>
  );
}
