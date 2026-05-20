import i18next from 'i18next';

i18next.init({
  resources: {
    ar: {
      common: {
        footer: {
          account: "الحساب",
          accountNav: {
            title: "الحساب"
          }
        }
      }
    }
  },
  lng: 'ar',
  fallbackNS: 'common',
  defaultNS: 'common',
  ns: ['common', 'account'],
  nsSeparator: '.',
}).then(() => {
  console.log("common.footer.account ->", i18next.t('common.footer.account'));
  console.log("common.footer.accountNav.title ->", i18next.t('common.footer.accountNav.title'));
});
