import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';

import { AuthCard } from './components/AuthCard';
import { FormField } from './components/FormField';
import { registerSchema, type RegisterFormValues } from './schemas';
import { useAuth } from './useAuth';
import { resolvePostAuthDestination } from './postAuthDestination';

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
      const user = await registerAccount(values);
      const dest = resolvePostAuthDestination(user, null);
      navigate(dest, { replace: true });
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        setServerError(
          status === 409
            ? t('auth.errors.emailTaken')
            : t('auth.errors.unknown'),
        );
      } else {
        setServerError(t('auth.errors.unknown'));
      }
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
            className="font-medium text-brand underline-offset-4 transition-colors hover:text-brand-hover hover:underline"
          >
            {t('auth.signInNow')}
          </Link>
        </>
      }
    >
      <Form onSubmit={onSubmit} className="flex flex-col gap-4">
        {serverError ? (
          <Alert status="danger" role="alert">
            <Alert.Content>
              <Alert.Description>{serverError}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <FormField
          name="fullName"
          control={control}
          label={t('auth.fullName')}
          description={t('auth.fullNameHint')}
          autoComplete="name"
          isRequired
          variant="bordered"
        />

        <FormField
          name="email"
          control={control}
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          isRequired
          variant="bordered"
        />

        <FormField
          name="password"
          control={control}
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          description={t('auth.passwordHint')}
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
          {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
        </Button>
      </Form>
    </AuthCard>
  );
}
