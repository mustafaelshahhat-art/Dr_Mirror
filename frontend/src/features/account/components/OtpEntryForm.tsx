import { Alert, Button, Description, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { accountApi } from '../api';
import type { OtpPurpose, OtpSendStatus, SendOtpResponse } from '../types';

const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'account.account.phone.codeInvalidFormat'),
});

type OtpValues = z.infer<typeof otpSchema>;

interface OtpEntryFormProps {
  purpose: OtpPurpose;
  sessionId?: string;
  maskedPhone?: string;
  initialCooldownSeconds?: number;
  initialResendsRemaining?: number;
  initialSendStatus?: OtpSendStatus;
  initialSendError?: string | null;
  onVerified: () => void | Promise<void>;
}

export function OtpEntryForm({
  purpose,
  sessionId,
  maskedPhone,
  initialCooldownSeconds = 60,
  initialResendsRemaining = 3,
  initialSendStatus = 'sending',
  initialSendError = null,
  onVerified,
}: OtpEntryFormProps) {
  const { t } = useTranslation();
  const [cooldown, setCooldown] = useState(initialCooldownSeconds);
  const [resendsRemaining, setResendsRemaining] = useState(initialResendsRemaining);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(initialSendError);
  const [currentMaskedPhone, setCurrentMaskedPhone] = useState(maskedPhone);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [sendStatus, setSendStatus] = useState<OtpSendStatus>(initialSendStatus);

  const { control, handleSubmit, reset } = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    if (!currentSessionId || sendStatus !== 'sending') return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;

    const poll = async () => {
      attempts += 1;
      try {
        const response = await accountApi.getOtpSendStatus(currentSessionId);
        if (cancelled) return;
        setSendStatus(response.status);
        if (response.status === 'failed') {
          setSendError(t('account.account.phone.sendFailed'));
        } else if (response.status === 'sent') {
          setSendError(null);
        }
      } catch {
        if (!cancelled && attempts >= maxAttempts) {
          setSendStatus('failed');
          setSendError(t('account.account.phone.sendFailed'));
        }
      }
    };

    const id = window.setInterval(() => {
      if (attempts >= maxAttempts) {
        window.clearInterval(id);
        if (!cancelled && sendStatus === 'sending') {
          setSendStatus('failed');
          setSendError(t('account.account.phone.sendFailed'));
        }
        return;
      }
      void poll();
    }, 1500);

    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [currentSessionId, sendStatus, t]);

  const verifyMutation = useMutation({
    mutationFn: (code: string) => accountApi.verifyOtp(purpose, code),
    onSuccess: async () => {
      setServerError(null);
      reset();
      await onVerified();
    },
    onError: (error) => {
      setServerError(mapOtpError(error, t));
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => accountApi.sendOtp(purpose),
    onMutate: () => {
      setSendStatus('sending');
      setSendError(null);
      setServerError(null);
    },
    onSuccess: (response: SendOtpResponse) => {
      setServerError(null);
      setSendError(null);
      setCurrentSessionId(response.sessionId);
      setCurrentMaskedPhone(response.maskedPhone);
      setCooldown(response.cooldownSeconds);
      setResendsRemaining(response.resendsRemaining);
      setSendStatus(response.status);
    },
    onError: (error) => {
      setSendStatus('failed');
      setSendError(mapOtpError(error, t));
      if (isAxiosError(error)) {
        const data = error.response?.data as { code?: string; retryAfterSeconds?: number } | undefined;
        if (data?.code === 'OtpCooldownActive' && data.retryAfterSeconds) {
          setCooldown(data.retryAfterSeconds);
        }
      }
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (verifyMutation.isPending) return;
    verifyMutation.mutate(values.code);
  });
  const canRetrySend = sendStatus === 'failed' && resendsRemaining > 0 && !resendMutation.isPending;
  const canResend = cooldown === 0 && resendsRemaining > 0 && !resendMutation.isPending && sendStatus !== 'sending';
  const statusText = sendStatus === 'sent'
    ? t('account.account.phone.sent')
    : sendStatus === 'failed'
      ? t('account.account.phone.sendFailed')
      : t('account.account.phone.sending');

  return (
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-semibold">{t('account.account.phone.verifyTitle')}</h2>
          <p className="mt-1 text-sm text-default-500">
            {t('account.account.phone.otpPrompt', { phone: currentMaskedPhone ?? maskedPhone ?? '' })}
          </p>
          <p className="mt-1 text-sm text-default-500">{t('account.account.phone.enterWhenArrives')}</p>
        </div>
      </div>

      <div
        role="status"
        className="flex items-start gap-2 rounded-xl border border-primary/20 bg-content1/60 px-3 py-2 text-sm text-default-700"
      >
        {sendStatus === 'sending' ? <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-primary" aria-hidden /> : null}
        <span>
          <span className="block font-medium">{statusText}</span>
          {sendStatus === 'sending' ? <span className="block text-xs text-default-500">{t('account.account.phone.mayTakeSeconds')}</span> : null}
        </span>
      </div>

      {sendError ? (
        // eslint-disable-next-line i18next/no-literal-string -- component status token, not user copy
        <Alert status="danger" role="alert" className="rounded-xl">
          <Alert.Content>
            <Alert.Description>{sendError}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {serverError ? (
        // eslint-disable-next-line i18next/no-literal-string -- component status token, not user copy
        <Alert status="danger" role="alert" className="rounded-xl">
          <Alert.Content>
            <Alert.Description>{serverError}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <Form
        id="otp-form"
        data-testid="otp-form"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void onSubmit(event);
        }}
        className="space-y-4"
      >
        <Controller
          name="code"
          control={control}
          render={({ field, fieldState }) => (
            <TextField isInvalid={Boolean(fieldState.error)} className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">{t('account.account.phone.codeLabel')}</Label>
              <Input
                {...field}
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                dir="ltr"
                className="border border-default-400 text-center text-lg tracking-widest dark:border-default-300"
              />
              <Description className="text-xs text-default-500">
                {cooldown > 0
                  ? t('account.account.phone.cooldown', { seconds: cooldown })
                  : t('account.account.phone.resendsRemaining', { count: resendsRemaining })}
              </Description>
              {fieldState.error?.message ? (
                <FieldError className="text-xs text-danger">{t(fieldState.error.message)}</FieldError>
              ) : null}
            </TextField>
          )}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            variant="primary"
            isPending={verifyMutation.isPending}
            isDisabled={verifyMutation.isPending}
          >
            {t('account.account.phone.verifySubmit')}
          </Button>
          <Button
            type="button"
            variant="outline"
            isDisabled={!(canRetrySend || canResend)}
            isPending={resendMutation.isPending}
            onPress={() => resendMutation.mutate()}
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="size-4" aria-hidden />
              {t('account.account.phone.resend')}
            </span>
          </Button>
        </div>
      </Form>
    </div>
  );
}

function mapOtpError(error: unknown, t: (key: string, options?: Record<string, unknown>) => string) {
  if (!isAxiosError(error)) return t('account.account.phone.errorUnknown');
  const data = error.response?.data as { code?: string; retryAfterSeconds?: number; attemptsRemaining?: number } | undefined;
  switch (data?.code) {
    case 'OtpSessionLocked':
      return t('account.account.phone.locked');
    case 'OtpExpiredOrUsed':
      return t('account.account.phone.expired');
    case 'InvalidOtpCode':
      return t('account.account.phone.wrongCode', { count: data.attemptsRemaining ?? 0 });
    case 'OtpCooldownActive':
      return t('account.account.phone.cooldown', { seconds: data.retryAfterSeconds ?? 60 });
    case 'WhatsAppUnavailable':
      return t('account.account.phone.whatsappUnavailable');
    case 'NoPhoneOnFile':
      return t('account.account.checkout.noPhoneOnFile');
    default:
      return t('account.account.phone.errorUnknown');
  }
}
