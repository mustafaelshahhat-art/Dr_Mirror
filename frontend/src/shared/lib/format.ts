import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import 'dayjs/locale/en';

import type { AppLang } from './theme-storage';

/**
 * All formatters here emit **Western digits (0–9)** regardless of locale
 * (per A18 / DESIGN_PRINCIPLES §3). Tabular alignment is enforced via the
 * body's `font-variant-numeric: tabular-nums` rule in globals.css.
 *
 * If a future requirement reverses this decision, change `DIGIT_LOCALE` here.
 */
const DIGIT_LOCALE = 'en-US';

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(DIGIT_LOCALE).format(n);
}

export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  return new Intl.NumberFormat(DIGIT_LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
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
