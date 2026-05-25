import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import arAccount from '../locales/ar/account.json';
import arAddresses from '../locales/ar/addresses.json';
import arAdmin from '../locales/ar/admin.json';
import arAuth from '../locales/ar/auth.json';
import arCart from '../locales/ar/cart.json';
import arCatalog from '../locales/ar/catalog.json';
import arCheckout from '../locales/ar/checkout.json';
import arCommon from '../locales/ar/common.json';
import arGovernates from '../locales/ar/governorates.json';
import arErrors from '../locales/ar/errors.json';
import arInquiries from '../locales/ar/inquiries.json';
import arOrders from '../locales/ar/orders.json';
import arNotifications from '../locales/ar/notifications.json';
import arReturns from '../locales/ar/returns.json';
import arShipping from '../locales/ar/shipping.json';
import enAccount from '../locales/en/account.json';
import enAddresses from '../locales/en/addresses.json';
import enAdmin from '../locales/en/admin.json';
import enAuth from '../locales/en/auth.json';
import enCart from '../locales/en/cart.json';
import enCatalog from '../locales/en/catalog.json';
import enCheckout from '../locales/en/checkout.json';
import enCommon from '../locales/en/common.json';
import enGovernates from '../locales/en/governorates.json';
import enErrors from '../locales/en/errors.json';
import enInquiries from '../locales/en/inquiries.json';
import enOrders from '../locales/en/orders.json';
import enNotifications from '../locales/en/notifications.json';
import enReturns from '../locales/en/returns.json';
import enShipping from '../locales/en/shipping.json';

const testI18n = i18n.createInstance();

void testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
      ar: {
        account: arAccount,
        common: arCommon,
        auth: arAuth,
        catalog: arCatalog,
        cart: arCart,
        checkout: arCheckout,
        errors: arErrors,
        orders: arOrders,
        notifications: arNotifications,
        admin: arAdmin,
        addresses: arAddresses,
        governorates: arGovernates,
        inquiries: arInquiries,
        returns: arReturns,
        shipping: arShipping,
      },
      en: {
        account: enAccount,
        common: enCommon,
        auth: enAuth,
        catalog: enCatalog,
        cart: enCart,
        checkout: enCheckout,
        errors: enErrors,
        orders: enOrders,
        notifications: enNotifications,
        admin: enAdmin,
        addresses: enAddresses,
        governorates: enGovernates,
        inquiries: enInquiries,
        returns: enReturns,
        shipping: enShipping,
      },
  },
  defaultNS: 'common',
  fallbackNS: 'common',
  ns: ['common', 'auth', 'catalog', 'cart', 'checkout', 'errors', 'orders', 'notifications', 'admin', 'addresses', 'governorates', 'inquiries', 'account', 'returns', 'shipping'],
  nsSeparator: '.',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default testI18n;
