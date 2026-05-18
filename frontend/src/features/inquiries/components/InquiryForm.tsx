import { Button, Form, Input, Label, TextArea, TextField } from '@heroui/react';
import { isAxiosError } from 'axios';
import { Check, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ProblemDetails } from '../../auth/types';
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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
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
    } catch (err) {
      const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
      setError(problem?.detail ?? problem?.title ?? t('inquiries.form.errors.unknown'));
    }
  }

  function reset() {
    setSuccess(false);
    setError(null);
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
      <section className="space-y-3 rounded-large border border-success/30 bg-success/5 p-6 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-success/15">
          <Check className="size-5 text-success" aria-hidden />
        </div>
        <h2 className="text-base font-semibold text-foreground">
          {t('inquiries.form.successTitle')}
        </h2>
        <p className="text-sm text-default-500">{t('inquiries.form.successSubtitle')}</p>
        <Button type="button" variant="ghost" size="sm" onPress={reset}>
          {t('inquiries.form.sendAnother')}
        </Button>
      </section>
    );
  }

  return (
    <Form
      onSubmit={onSubmit}
      className="space-y-4 rounded-large border border-divider/60 bg-content1 p-4"
    >
      <header className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          {productId ? t('inquiries.form.productHeading') : t('inquiries.form.heading')}
        </h2>
        <p className="text-xs text-default-500">{t('inquiries.form.subtitle')}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>

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
        />
      </TextField>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

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
      />
    </TextField>
  );
}
