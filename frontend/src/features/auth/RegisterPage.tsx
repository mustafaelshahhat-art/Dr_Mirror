import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';

import { AuthCard } from './components/AuthCard';
import { FormField } from './components/FormField';
import { registerSchema, type RegisterFormValues } from './schemas';
import type { ProblemDetails } from './types';
import { useAuth } from './useAuth';

export function RegisterPage() {
  const { t } = useTranslation();
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', fullName: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await registerAccount(values);
      navigate('/', { replace: true });
    } catch (err) {
      const problem = isAxiosError<ProblemDetails>(err) ? err.response?.data : undefined;
      setServerError(problem?.detail ?? problem?.title ?? t('auth.errors.unknown'));
    }
  });

  return (
    <AuthCard
      title={t('auth.signUpTitle')}
      subtitle={t('auth.signUpSubtitle')}
      footer={
        <>
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('auth.signInNow')}
          </Link>
        </>
      }
    >
      <Form onSubmit={onSubmit} className="flex flex-col gap-4">
        {serverError ? (
          <div
            role="alert"
            className="rounded-medium border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {serverError}
          </div>
        ) : null}

        <FormField
          name="fullName"
          control={control}
          label={t('auth.fullName')}
          autoComplete="name"
          isRequired
        />

        <FormField
          name="email"
          control={control}
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          isRequired
        />

        <FormField
          name="password"
          control={control}
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          description={t('auth.passwordHint')}
          isRequired
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isDisabled={isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
        </Button>
      </Form>
    </AuthCard>
  );
}
