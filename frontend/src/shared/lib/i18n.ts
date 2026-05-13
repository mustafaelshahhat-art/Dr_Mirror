import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import arAuth from '../../locales/ar/auth.json';
import arCommon from '../../locales/ar/common.json';
import enAuth from '../../locales/en/auth.json';
import enCommon from '../../locales/en/common.json';

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
      ar: { common: arCommon, auth: arAuth },
      en: { common: enCommon, auth: enAuth },
    },
    fallbackLng: DEFAULT_LANG,
    supportedLngs: [...SUPPORTED_LANGS],
    // Flat key lookup: t('auth.signIn') reads from the 'auth' namespace.
    fallbackNS: 'common',
    defaultNS: 'common',
    ns: ['common', 'auth'],
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
