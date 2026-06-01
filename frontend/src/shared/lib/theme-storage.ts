/**
 * Canonical storage keys + defaults for theme and locale.
 *
 * These constants are used by the anti-FOUC inline script in index.html,
 * the next-themes ThemeProvider, and the i18next LanguageDetector — they
 * MUST stay in sync with each other and with index.html.
 */

export const THEME_STORAGE_KEY = 'dr-mirror-theme';
export const LANG_STORAGE_KEY = 'dr-mirror-lang';

export const DEFAULT_THEME = 'light' as const;
export const DEFAULT_LANG = 'en' as const;

export type AppTheme = 'dark' | 'light';
export type AppLang = 'ar' | 'en';
export const SUPPORTED_LANGS: readonly AppLang[] = ['ar', 'en'] as const;
