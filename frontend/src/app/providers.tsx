import { useEffect, type ReactNode } from 'react';
import { I18nProvider, RouterProvider, ToastProvider } from '@heroui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { useHref, useNavigate } from 'react-router-dom';

import { AuthProvider } from '../features/auth/AuthProvider';
import { CartProvider } from '../features/cart/CartProvider';
import { DowntimeProvider } from '../shared/components/DowntimeProvider';
import i18n from '../shared/lib/i18n';
import {
  DEFAULT_LANG,
  DEFAULT_THEME,
  LANG_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type AppLang,
} from '../shared/lib/theme-storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Syncs the i18next resolved language to <html lang> and <html dir>,
 * and persists the choice into localStorage so the anti-FOUC inline
 * script in index.html can restore it on the next reload.
 *
 * Theme × Direction are independent axes — next-themes owns <html class>,
 * this owns <html lang> and <html dir>.
 */
function DirectionSync({ children }: { children: ReactNode }) {
  const { i18n: client } = useTranslation();
  useEffect(() => {
    const lang = (client.resolvedLanguage ?? DEFAULT_LANG) as AppLang;
    const dir = client.dir(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* localStorage unavailable — safe to ignore */
    }
  }, [client, client.resolvedLanguage]);
  return <>{children}</>;
}

/**
 * Wraps HeroUI's RAC I18nProvider with the live i18next-resolved locale so
 * HeroUI components pick up the correct direction context automatically.
 */
function LocaleScope({ children }: { children: ReactNode }) {
  const { i18n: client } = useTranslation();
  const locale = (client.resolvedLanguage ?? DEFAULT_LANG) as AppLang;
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}

/**
 * Provider chain (per architectural plan section 3.4, adjusted for HeroUI v3 / RAC):
 *   ThemeProvider (next-themes, owns html.class)
 *     → RouterProvider (React Aria — connects HeroUI Links to React Router)
 *       → QueryClientProvider
 *         → I18nextProvider (translation backbone)
 *           → LocaleScope (RAC I18nProvider, picks current locale)
 *             → ToastProvider (localized, directional toast surface)
 *               → DirectionSync (sets html lang + dir, persists lang)
 */
export function Providers({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    // eslint-disable-next-line i18next/no-literal-string -- next-themes API prop, not user copy
    <NextThemesProvider attribute="class"
      defaultTheme={DEFAULT_THEME}
      enableSystem={false}
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      <RouterProvider navigate={navigate} useHref={useHref}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <LocaleScope>
              <ToastProvider />
              <DirectionSync>
                <AuthProvider>
                  <CartProvider>
                    <DowntimeProvider>{children}</DowntimeProvider>
                  </CartProvider>
                </AuthProvider>
              </DirectionSync>
            </LocaleScope>
          </I18nextProvider>
        </QueryClientProvider>
      </RouterProvider>
    </NextThemesProvider>
  );
}
