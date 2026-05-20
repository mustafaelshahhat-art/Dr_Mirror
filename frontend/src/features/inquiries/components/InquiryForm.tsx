import { Alert, Button, Fieldset, Form, Heading, Input, Label, Paragraph, TextArea, TextField } from '@heroui/react';
import { Check, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSubmitInquiryMutation } from '../hooks';

interface InquiryFormProps {
  /** When set, ties the inquiry to this product. Omit for a general inquiry. */
  productId?: string;
  /** Pre-filled subject line — typically the product name. */
  defaultSubject?: string;
}

/**
 * Inline inquiry form. Validates client-side, submits to <c>POST /api/inquiries</c>,
 * and shows a success state on completion. Used both on product detail pages
 * (with productId/defaultSubject) and as a standalone "Contact us" form.
 */
export function InquiryForm({ productId, defaultSubject }: InquiryFormProps) {
  const { t } = useTranslation();
  const submit = useSubmitInquiryMutation();
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: defaultSubject ?? '',
    message: '',
  });

  // Field-name strings below are RHF programmatic identifiers, not user copy.
  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await submit.mutateAsync({
        productId: productId ?? null,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSuccess(true);
    } catch {
      // Toast emitted by mutation onError.
    }
  }

  function reset() {
    setSuccess(false);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      subject: defaultSubject ?? '',
      message: '',
    });
  }

  if (success) {
    return (
      <Alert status="success">
        <Alert.Indicator>
          <Check className="size-5" aria-hidden />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>{t('inquiries.form.successTitle')}</Alert.Title>
          <Alert.Description>{t('inquiries.form.successSubtitle')}</Alert.Description>
        </Alert.Content>
        <Button type="button" variant="ghost" size="sm" onPress={reset}>
          {t('inquiries.form.sendAnother')}
        </Button>
      </Alert>
    );
  }

  return (
    <Form
      onSubmit={onSubmit}
      className="content-surface space-y-4 p-4"
    >
      <header className="space-y-1">
        <Heading level={2} className="text-sm font-semibold text-foreground">
          {productId ? t('inquiries.form.productHeading') : t('inquiries.form.heading')}
        </Heading>
        <Paragraph className="text-sm text-default-500 sm:text-base">{t('inquiries.form.subtitle')}</Paragraph>
      </header>

      <Fieldset>
        <Fieldset.Legend className="text-xs uppercase tracking-wide text-default-500">
          {t('inquiries.form.contactLegend')}
        </Fieldset.Legend>
        <Fieldset.Group className="grid gap-3 sm:grid-cols-2">
          <Field
            label={t('inquiries.form.fullName')}
            value={form.fullName}
            // eslint-disable-next-line i18next/no-literal-string
            onChange={(v) => update('fullName', v)}
            required
            maxLength={100}
            autoComplete="name"
          />
          <Field
            label={t('inquiries.form.email')}
            type="email"
            value={form.email}
            // eslint-disable-next-line i18next/no-literal-string
            onChange={(v) => update('email', v)}
            required
            maxLength={200}
            autoComplete="email"
            dir="ltr"
          />
          <Field
            label={t('inquiries.form.phone')}
            type="tel"
            value={form.phone}
            // eslint-disable-next-line i18next/no-literal-string
            onChange={(v) => update('phone', v)}
            maxLength={30}
            autoComplete="tel"
            dir="ltr"
          />
          <Field
            label={t('inquiries.form.subject')}
            value={form.subject}
            // eslint-disable-next-line i18next/no-literal-string
            onChange={(v) => update('subject', v)}
            required
            maxLength={200}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend className="text-xs uppercase tracking-wide text-default-500">
          {t('inquiries.form.messageLegend')}
        </Fieldset.Legend>
        <Fieldset.Group>
          <TextField isRequired className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-default-700 dark:text-default-300">
              {t('inquiries.form.message')}
            </Label>
            <TextArea
              rows={4}
              maxLength={2000}
              value={form.message}
              // eslint-disable-next-line i18next/no-literal-string
              onChange={(e) => update('message', (e.target as HTMLTextAreaElement).value)}
              className="border border-default-400 dark:border-default-300"
            />
          </TextField>
        </Fieldset.Group>
      </Fieldset>

      <Button
        type="submit"
        variant="primary"
        isPending={submit.isPending}
      >
        <span className="inline-flex items-center gap-2">
          <Send className="size-4" aria-hidden />
          {submit.isPending ? t('inquiries.form.submitting') : t('inquiries.form.submit')}
        </span>
      </Button>
    </Form>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: 'text' | 'email' | 'tel';
  required?: boolean;
  maxLength?: number;
  autoComplete?: string;
  dir?: 'ltr' | 'rtl';
}

function Field({ label, value, onChange, type = 'text', required, maxLength, autoComplete, dir }: FieldProps) {
  return (
    <TextField isRequired={required} className="flex flex-col gap-1">
      <Label className="text-xs font-medium text-default-700 dark:text-default-300">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        maxLength={maxLength}
        autoComplete={autoComplete}
        dir={dir}
        className="border border-default-400 dark:border-default-300"
      />
    </TextField>
  );
}
