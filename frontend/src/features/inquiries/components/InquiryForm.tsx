import { Alert, Button, FieldError, Fieldset, Form, Heading, Input, Label, Paragraph, TextArea, TextField } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Send } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useSubmitInquiryMutation } from '../hooks';

const egyptPhoneRegex = /^\+?2?01[0125]\d{8}$/;

const inquirySchema = z.object({
  fullName: z.string().trim().min(2, 'inquiries.validation.fullNameMin').max(100, 'inquiries.validation.fullNameMax'),
  email: z.string().trim().email('inquiries.validation.emailInvalid'),
  phone: z.string().trim()
    .refine(v => v === '' || egyptPhoneRegex.test(v), 'inquiries.validation.phoneInvalid'),
  subject: z.string().trim().min(5, 'inquiries.validation.subjectMin').max(200, 'inquiries.validation.subjectMax'),
  message: z.string().trim().min(10, 'inquiries.validation.messageMin').max(2000, 'inquiries.validation.messageMax'),
});

type InquiryFormValues = z.infer<typeof inquirySchema>;

interface InquiryFormProps {
  productId?: string;
  defaultSubject?: string;
}

export function InquiryForm({ productId, defaultSubject }: InquiryFormProps) {
  const { t } = useTranslation();
  const submit = useSubmitInquiryMutation();
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors }, reset } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      subject: defaultSubject ?? '',
      message: '',
    },
  });

  function errMsg(key: string | undefined) {
    return key ? t(key) : null;
  }

  async function onSubmit(values: InquiryFormValues) {
    setSubmitError(null);
    try {
      await submit.mutateAsync({
        productId: productId ?? null,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone || null,
        subject: values.subject,
        message: values.message,
      });
      setSuccess(true);
    } catch {
      setSubmitError(t('inquiries.form.submitError'));
      // Toast emitted by mutation onError.
    }
  }

  function onReset() {
    setSuccess(false);
    setSubmitError(null);
    reset({
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
        <Button type="button" variant="ghost" size="sm" onPress={onReset}>
          {t('inquiries.form.sendAnother')}
        </Button>
      </Alert>
    );
  }

  return (
    <Form
      onSubmit={handleSubmit(onSubmit)}
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
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => (
              <TextField
                isRequired
                isInvalid={!!errors.fullName}
                className="flex flex-col gap-1"
              >
                <Label className="text-xs font-medium text-default-700 dark:text-default-300">
                  {t('inquiries.form.fullName')}
                </Label>
                <Input
                  {...field}
                  maxLength={100}
                  autoComplete="name"
                  className="border border-default-400 dark:border-default-300"
                />
                {errMsg(errors.fullName?.message) && (
                  <FieldError className="text-xs text-danger">{errMsg(errors.fullName?.message)}</FieldError>
                )}
              </TextField>
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                isRequired
                isInvalid={!!errors.email}
                className="flex flex-col gap-1"
              >
                <Label className="text-xs font-medium text-default-700 dark:text-default-300">
                  {t('inquiries.form.email')}
                </Label>
                <Input
                  {...field}
                  type="email"
                  maxLength={200}
                  autoComplete="email"
                  dir="ltr"
                  className="border border-default-400 dark:border-default-300"
                />
                {errMsg(errors.email?.message) && (
                  <FieldError className="text-xs text-danger">{errMsg(errors.email?.message)}</FieldError>
                )}
              </TextField>
            )}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <TextField
                isInvalid={!!errors.phone}
                className="flex flex-col gap-1"
              >
                <Label className="text-xs font-medium text-default-700 dark:text-default-300">
                  {t('inquiries.form.phone')}
                </Label>
                <Input
                  {...field}
                  type="tel"
                  maxLength={30}
                  autoComplete="tel"
                  dir="ltr"
                  className="border border-default-400 dark:border-default-300"
                />
                {errMsg(errors.phone?.message) && (
                  <FieldError className="text-xs text-danger">{errMsg(errors.phone?.message)}</FieldError>
                )}
              </TextField>
            )}
          />
          <Controller
            name="subject"
            control={control}
            render={({ field }) => (
              <TextField
                isRequired
                isInvalid={!!errors.subject}
                className="flex flex-col gap-1"
              >
                <Label className="text-xs font-medium text-default-700 dark:text-default-300">
                  {t('inquiries.form.subject')}
                </Label>
                <Input
                  {...field}
                  maxLength={200}
                  className="border border-default-400 dark:border-default-300"
                />
                {errMsg(errors.subject?.message) && (
                  <FieldError className="text-xs text-danger">{errMsg(errors.subject?.message)}</FieldError>
                )}
              </TextField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend className="text-xs uppercase tracking-wide text-default-500">
          {t('inquiries.form.messageLegend')}
        </Fieldset.Legend>
        <Fieldset.Group>
          <Controller
            name="message"
            control={control}
            render={({ field }) => {
              const length = field.value?.length ?? 0;

              return (
                <TextField
                  isRequired
                  isInvalid={!!errors.message}
                  className="flex flex-col gap-1"
                >
                  <Label className="text-xs font-medium text-default-700 dark:text-default-300">
                    {t('inquiries.form.message')}
                  </Label>
                  <TextArea
                    {...field}
                    rows={4}
                    maxLength={2000}
                    className="border border-default-400 dark:border-default-300"
                  />
                  <p className="text-sm text-default-400 text-end">
                    {t('inquiries.form.messageCounter', { current: length })}
                  </p>
                  {errMsg(errors.message?.message) && (
                    <FieldError className="text-xs text-danger">{errMsg(errors.message?.message)}</FieldError>
                  )}
                </TextField>
              );
            }}
          />
        </Fieldset.Group>
      </Fieldset>

      {submitError && (
        <Alert status="danger" role="alert">
          <Alert.Content>
            <Alert.Description>{submitError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <Button
        type="submit"
        variant="primary"
        isPending={submit.isPending}
        isDisabled={submit.isPending}
      >
        <span className="inline-flex items-center gap-2">
          <Send className="size-4" aria-hidden />
          {submit.isPending ? t('inquiries.form.submitting') : t('inquiries.form.submit')}
        </span>
      </Button>
    </Form>
  );
}
