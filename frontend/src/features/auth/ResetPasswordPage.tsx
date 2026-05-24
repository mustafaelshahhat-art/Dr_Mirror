import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Form } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { CircleCheck, CircleAlert } from 'lucide-react';
import { api } from '../../shared/lib/api-client';

import { AuthCard } from './components/AuthCard';
import { FormField } from './components/FormField';

const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'auth.errors.passwordTooShort')
      .max(128, 'auth.errors.passwordTooLong')
      .regex(/[a-z]/, 'auth.errors.passwordMissingLower')
      .regex(/[A-Z]/, 'auth.errors.passwordMissingUpper')
      .regex(/[0-9]/, 'auth.errors.passwordMissingDigit'),
    confirmPassword: z.string().min(1, 'auth.errors.passwordRequired'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'auth.errors.passwordsMismatch',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

type PageState = 'form' | 'success' | 'invalid';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [pageState, setPageState] = useState<PageState>(() => {
    const userId = searchParams.get('userId');
    const token = searchParams.get('token');
    return userId && token ? 'form' : 'invalid';
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const userId = searchParams.get('userId')!;
    const token = searchParams.get('token')!;

    try {
      await api.post('/auth/reset-password', {
        userId,
        token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      setPageState('success');
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 400) {
        setPageState('invalid');
      }
    }
  });

  if (pageState === 'success') {
    return (
      <AuthCard title={t('auth.resetPasswordSuccessTitle')}>
        <div className="flex flex-col items-center gap-3 text-center">
          <CircleCheck className="size-10 text-success" aria-hidden />
          <p className="text-sm text-muted">{t('auth.resetPasswordSuccessMessage')}</p>
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

  if (pageState === 'invalid') {
    return (
      <AuthCard title={t('auth.resetPasswordInvalidTitle')}>
        <div className="flex flex-col items-center gap-3 text-center">
          <CircleAlert className="size-10 text-danger" aria-hidden />
          <p className="text-sm text-muted">{t('auth.resetPasswordInvalidMessage')}</p>
          <Link
            to="/forgot-password"
            className="mt-2 text-sm font-medium text-brand underline-offset-4 transition-colors hover:text-brand-hover hover:underline"
          >
            {t('auth.requestNewLink')}
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('auth.resetPasswordTitle')}
      subtitle={t('auth.resetPasswordSubtitle')}
    >
      <Form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormField
          name="newPassword"
          control={control}
          label={t('auth.newPassword')}
          type="password"
          autoComplete="new-password"
          isRequired
          variant="bordered"
          description={t('auth.passwordHint')}
        />

        <FormField
          name="confirmPassword"
          control={control}
          label={t('auth.confirmPassword')}
          type="password"
          autoComplete="new-password"
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
          {isSubmitting ? t('auth.resetPasswordSubmitting') : t('auth.resetPasswordSubmit')}
        </Button>
      </Form>
    </AuthCard>
  );
}
