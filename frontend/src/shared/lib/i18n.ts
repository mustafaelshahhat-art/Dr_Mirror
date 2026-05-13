import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import arAuth from '../../locales/ar/auth.json';
import arCart from '../../locales/ar/cart.json';
import arCatalog from '../../locales/ar/catalog.json';
import arCheckout from '../../locales/ar/checkout.json';
import arCommon from '../../locales/ar/common.json';
import arOrders from '../../locales/ar/orders.json';
import enAuth from '../../locales/en/auth.json';
import enCart from '../../locales/en/cart.json';
import enCatalog from '../../locales/en/catalog.json';
import enCheckout from '../../locales/en/checkout.json';
import enCommon from '../../locales/en/common.json';
import enOrders from '../../locales/en/orders.json';

import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  SUPPORTED_LANGS,
} from './theme-storage';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        common: arCommon,
        auth: arAuth,
        catalog: arCatalog,
        cart: arCart,
        checkout: arCheckout,
        orders: arOrders,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        catalog: enCatalog,
        cart: enCart,
        checkout: enCheckout,
        orders: enOrders,
      },
    },
    fallbackLng: DEFAULT_LANG,
    supportedLngs: [...SUPPORTED_LANGS],
    // Flat key lookup: t('auth.signIn') reads from the 'auth' namespace.
    fallbackNS: 'common',
    defaultNS: 'common',
    ns: ['common', 'auth', 'catalog', 'cart', 'checkout', 'orders'],
    // Allow t('auth.signIn') to resolve via nsSeparator on the key.
    nsSeparator: '.',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
    returnNull: false,
  });

export default i18n;
