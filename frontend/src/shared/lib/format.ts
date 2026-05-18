import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import 'dayjs/locale/en';

import type { AppLang } from './theme-storage';

/**
 * All formatters here emit **Western digits (0–9)** regardless of locale
 * (per A18 / DESIGN_PRINCIPLES section 3). Tabular alignment is enforced via the
 * body's `font-variant-numeric: tabular-nums` rule in globals.css.
 *
 * If a future requirement reverses this decision, change `DIGIT_LOCALE` here.
 */
const DIGIT_LOCALE = 'en-US';

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(DIGIT_LOCALE).format(n);
}

/**
 * Locked currency display per the M2 decision:
 *   - ar  →  "1,250.00 ج.م"  (Arabic suffix, Western numerals)
 *   - en  →  "EGP 1,250.00"  (ISO prefix, Western numerals)
 *
 * Both use US-style grouping (comma thousands, period decimal) so prices
 * render correctly under `font-variant-numeric: tabular-nums`. Override
 * `currency` only for non-EGP futures.
 */
export function formatCurrency(
  amount: number,
  lang: AppLang = 'ar',
  currency: string = 'EGP',
): string {
  const formatted = new Intl.NumberFormat(DIGIT_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (lang === 'ar') {
    // ج.م = جنيه مصري (Egyptian Pound) — single dotted form is the most common.
    return currency === 'EGP' ? `${formatted} ج.م` : `${formatted} ${currency}`;
  }

  return `${currency} ${formatted}`;
}

/**
 * Format a date with the requested locale's month/day names but Western digits.
 * dayjs handles the locale-aware text; we keep digits Western via DIGIT_LOCALE.
 */
export function formatDate(
  value: Date | string | number,
  lang: AppLang = 'ar',
  template: string = 'YYYY-MM-DD',
): string {
  return dayjs(value).locale(lang).format(template);
}
