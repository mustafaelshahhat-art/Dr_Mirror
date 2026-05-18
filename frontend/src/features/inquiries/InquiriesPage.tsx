import { useTranslation } from 'react-i18next';

import { InquiryForm } from './components/InquiryForm';

export function InquiriesPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('inquiries.page.title')}</h1>
        <p className="text-sm text-default-500">{t('inquiries.page.subtitle')}</p>
      </header>
      <InquiryForm />
    </section>
  );
}
