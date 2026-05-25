import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Form } from '@heroui/react';
import { toast } from '@heroui/react/toast';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { FormField } from '../auth/components/FormField';
import { accountApi } from './api';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'auth.errors.passwordRequired'),
    newPassword: z
      .string()
      .min(8, 'account.account.security.passwordTooWeak')
      .max(128, 'account.account.security.passwordTooWeak')
      .regex(/[a-z]/, 'account.account.security.passwordTooWeak')
      .regex(/[A-Z]/, 'account.account.security.passwordTooWeak')
      .regex(/[0-9]/, 'account.account.security.passwordTooWeak'),
    confirmPassword: z.string().min(1, 'auth.errors.passwordRequired'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'account.account.security.passwordMismatch',
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
    mutationFn: accountApi.changePassword,
    onSuccess: () => {
      reset();
      setServerError(null);
      toast.success(t('account.account.security.success'));
    },
    onError: (err) => {
      const data = isAxiosError(err) ? err.response?.data as { code?: string } | undefined : undefined;
      if (data?.code === 'IncorrectCurrentPassword') {
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
