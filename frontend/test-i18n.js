import i18next from 'i18next';

i18next.init({
  resources: {
    en: {
      common: {
        account: {
          myOrders: {
            title: "My orders"
          }
        }
      },
      account: {
        account: {
          recentOrders: {
            title: "Recent orders"
          }
        }
      }
    }
  },
  lng: 'en',
  fallbackNS: 'common',
  defaultNS: 'common',
  ns: ['common', 'account'],
  nsSeparator: '.',
}).then(() => {
  console.log("account.myOrders.title ->", i18next.t('account.myOrders.title'));
  console.log("common.account.myOrders.title ->", i18next.t('common.account.myOrders.title'));
  console.log("account.account.recentOrders.title ->", i18next.t('account.account.recentOrders.title'));
});
