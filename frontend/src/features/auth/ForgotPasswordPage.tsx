import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Form } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import { api } from '../../shared/lib/api-client';

import { AuthCard } from './components/AuthCard';
import { FormField } from './components/FormField';

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, 'auth.errors.emailRequired')
    .email('auth.errors.emailInvalid')
    .max(256, 'auth.errors.emailTooLong'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post('/auth/forgot-password', { email: values.email });
    } catch {
      // intentionally ignored — always show success
    }
    setSubmitted(true);
  });

  if (submitted) {
    return (
      <AuthCard title={t('auth.forgotPasswordSuccessTitle')}>
        <div className="flex flex-col items-center gap-3 text-center">
          <CircleCheck className="size-10 text-success" aria-hidden />
          <p className="text-sm text-muted">{t('auth.forgotPasswordSuccessMessage')}</p>
          <Link
            to="/login"
            className="mt-2 text-sm font-medium text-brand underline-offset-4 transition-colors hover:text-brand-hover hover:underline"
          >
            {t('auth.backToLogin')}
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('auth.forgotPasswordTitle')}
      subtitle={t('auth.forgotPasswordSubtitle')}
      footer={
        <Link
          to="/login"
          className="text-sm font-medium text-brand underline-offset-4 transition-colors hover:text-brand-hover hover:underline"
        >
          {t('auth.backToLogin')}
        </Link>
      }
    >
      <Form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormField
          name="email"
          control={control}
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          autoCapitalize="off"
          isRequired
          variant="bordered"
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isPending={isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? t('auth.forgotPasswordSubmitting') : t('auth.forgotPasswordSubmit')}
        </Button>
      </Form>
    </AuthCard>
  );
}
