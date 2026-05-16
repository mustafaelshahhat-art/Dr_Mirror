import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';

import { AuthCard } from './components/AuthCard';
import { FormField } from './components/FormField';
import { loginSchema, type LoginFormValues } from './schemas';
import { useAuth } from './useAuth';
import { resolvePostAuthDestination } from './postAuthDestination';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const user = await login(values);
      const from =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? null;
      const dest = resolvePostAuthDestination(user, from);
      navigate(dest, { replace: true });
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        setServerError(
          status === 401 || status === 400
            ? t('auth.errors.invalidCredentials')
            : t('auth.errors.unknown'),
        );
      } else {
        setServerError(t('auth.errors.unknown'));
      }
    }
  });

  return (
    <AuthCard
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <>
          {t('auth.noAccountYet')}{' '}
          <Link
            to="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t('auth.createOne')}
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
          name="email"
          control={control}
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          isRequired
          variant="underlined"
        />

        <FormField
          name="password"
          control={control}
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          isRequired
          variant="underlined"
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isDisabled={isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </Form>
    </AuthCard>
  );
}
