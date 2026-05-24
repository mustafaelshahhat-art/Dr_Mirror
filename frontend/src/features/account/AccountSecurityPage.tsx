import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Form } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../shared/lib/api-client';

import { FormField } from '../auth/components/FormField';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'auth.errors.passwordRequired'),
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

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function AccountSecurityPage() {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: async (values: ChangePasswordValues) => {
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
    },
    onSuccess: () => {
      reset();
      setServerError(null);
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 400) {
        setServerError(t('account.account.security.errorIncorrectPassword'));
      } else {
        setServerError(t('account.account.security.errorUnknown'));
      }
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {t('account.account.security.title')}
      </h1>

      <div className="content-surface p-6">
        <h2 className="mb-4 text-base font-semibold">
          {t('account.account.security.changePasswordTitle')}
        </h2>

        <Form onSubmit={onSubmit} className="flex flex-col gap-4">
          {serverError ? (
            <p className="text-sm text-danger" role="alert">
              {serverError}
            </p>
          ) : null}

          {mutation.isSuccess ? (
            <p className="text-sm text-success" role="status">
              {t('account.account.security.success')}
            </p>
          ) : null}

          <FormField
            name="currentPassword"
            control={control}
            label={t('account.account.security.currentPassword')}
            type="password"
            autoComplete="current-password"
            isRequired
            variant="bordered"
          />

          <FormField
            name="newPassword"
            control={control}
            label={t('account.account.security.newPassword')}
            type="password"
            autoComplete="new-password"
            isRequired
            variant="bordered"
            description={t('auth.passwordHint')}
          />

          <FormField
            name="confirmPassword"
            control={control}
            label={t('account.account.security.confirmPassword')}
            type="password"
            autoComplete="new-password"
            isRequired
            variant="bordered"
          />

          <Button
            type="submit"
            variant="primary"
            isPending={isSubmitting || mutation.isPending}
            className="mt-2"
          >
            {isSubmitting || mutation.isPending
              ? t('account.account.security.submitting')
              : t('account.account.security.submit')}
          </Button>
        </Form>
      </div>
    </div>
  );
}
