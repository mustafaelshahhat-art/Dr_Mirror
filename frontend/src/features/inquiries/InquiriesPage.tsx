import { useTranslation } from 'react-i18next';

import { PageHeader } from '../../shared/components/PageHeader';
import { InquiryForm } from './components/InquiryForm';

export function InquiriesPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-prose space-y-8">
      <PageHeader title={t('inquiries.page.title')} subtitle={t('inquiries.page.subtitle')} />
      <InquiryForm />
    </section>
  );
}
