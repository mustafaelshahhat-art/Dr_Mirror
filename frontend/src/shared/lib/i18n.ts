import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import arAccount from '../../locales/ar/account.json';
import arAddresses from '../../locales/ar/addresses.json';
import arAdmin from '../../locales/ar/admin.json';
import arAuth from '../../locales/ar/auth.json';
import arCart from '../../locales/ar/cart.json';
import arCatalog from '../../locales/ar/catalog.json';
import arCheckout from '../../locales/ar/checkout.json';
import arCommon from '../../locales/ar/common.json';
import arGovernates from '../../locales/ar/governorates.json';
import arInquiries from '../../locales/ar/inquiries.json';
import arOrders from '../../locales/ar/orders.json';
import enAccount from '../../locales/en/account.json';
import enAddresses from '../../locales/en/addresses.json';
import enAdmin from '../../locales/en/admin.json';
import enAuth from '../../locales/en/auth.json';
import enCart from '../../locales/en/cart.json';
import enCatalog from '../../locales/en/catalog.json';
import enCheckout from '../../locales/en/checkout.json';
import enCommon from '../../locales/en/common.json';
import enGovernates from '../../locales/en/governorates.json';
import enInquiries from '../../locales/en/inquiries.json';
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
        account: arAccount,
        common: arCommon,
        auth: arAuth,
        catalog: arCatalog,
        cart: arCart,
        checkout: arCheckout,
        orders: arOrders,
        admin: arAdmin,
        addresses: arAddresses,
        governorates: arGovernates,
        inquiries: arInquiries,
      },
      en: {
        account: enAccount,
        common: enCommon,
        auth: enAuth,
        catalog: enCatalog,
        cart: enCart,
        checkout: enCheckout,
        orders: enOrders,
        admin: enAdmin,
        addresses: enAddresses,
        governorates: enGovernates,
        inquiries: enInquiries,
      },
    },
    fallbackLng: DEFAULT_LANG,
    supportedLngs: [...SUPPORTED_LANGS],
    // Flat key lookup: t('auth.signIn') reads from the 'auth' namespace.
    fallbackNS: 'common',
    defaultNS: 'common',
    ns: ['common', 'auth', 'catalog', 'cart', 'checkout', 'orders', 'admin', 'addresses', 'governorates', 'inquiries', 'account'],
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
