import { useTranslation } from 'react-i18next';

import { InquiryForm } from './components/InquiryForm';

export function InquiriesPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <header className="page-header">
        <h1 className="page-title">{t('inquiries.page.title')}</h1>
        <p className="page-subtitle">{t('inquiries.page.subtitle')}</p>
      </header>
      <InquiryForm />
    </section>
  );
}
