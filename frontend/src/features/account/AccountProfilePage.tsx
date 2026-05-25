import { Alert, Button, Chip, Form } from '@heroui/react';
import { toast } from '@heroui/react/toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { CheckCircle2, MessageCircle, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { QueryErrorState } from '../../shared/components/QueryErrorState';
import { queryKeys } from '../../shared/lib/query-keys';
import { FormField } from '../auth/components/FormField';
import { accountApi } from './api';
import { OtpEntryForm } from './components/OtpEntryForm';
import type { AccountProfileDto, OtpSendStatus } from './types';

const phoneRegex = /^0(10|11|12|15)\d{8}$/;

const profileSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, 'account.account.profile.nameLength')
    .max(120, 'account.account.profile.nameLength'),
  phoneNumber: z.string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || phoneRegex.test(value), 'account.account.profile.phoneInvalidFormat'),
});

type ProfileValues = z.infer<typeof profileSchema>;

interface OtpSessionViewModel {
  sessionId?: string;
  maskedPhone: string;
  cooldownSeconds: number;
  resendsRemaining: number;
  status: OtpSendStatus;
  sendError?: string | null;
}

export function AccountProfilePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.account.profile();

  const [otpSession, setOtpSession] = useState<OtpSessionViewModel | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const lastProfileRef = useRef<{ fullName: string; phoneNumber: string } | null>(null);

  const query = useQuery({
    queryKey,
    queryFn: accountApi.getProfile,
    refetchOnWindowFocus: false,
  });

  const { control, getValues, handleSubmit, reset, trigger, watch } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', phoneNumber: '' },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch is required for live phone verification state.
  const watchedPhone = watch('phoneNumber');

  useEffect(() => {
    if (!query.data) return;
    const nextProfile = {
      fullName: query.data.fullName,
      phoneNumber: query.data.phoneNumber ?? '',
    };
    const previousProfile = lastProfileRef.current;
    const profileChanged = !previousProfile
      || previousProfile.fullName !== nextProfile.fullName
      || previousProfile.phoneNumber !== nextProfile.phoneNumber;

    if (!profileChanged) return;

    reset(nextProfile);
    lastProfileRef.current = nextProfile;

    if (previousProfile && previousProfile.phoneNumber !== nextProfile.phoneNumber) {
      setOtpSession(null);
      setSendError(null);
    }
  }, [query.data, reset]);

  useEffect(() => {
    if (!otpSession) return;
    const savedPhone = query.data?.phoneNumber ?? '';
    const typedPhone = watchedPhone?.trim() ?? '';
    if (typedPhone !== savedPhone) {
      setOtpSession(null);
      setSendError(null);
    }
  }, [otpSession, query.data?.phoneNumber, watchedPhone]);

  const updateMutation = useMutation({
    mutationFn: (values: ProfileValues) => accountApi.updateProfile({
      fullName: values.fullName.trim(),
      phoneNumber: values.phoneNumber?.trim() || undefined,
    }),
    onSuccess: (profile: AccountProfileDto) => {
      queryClient.setQueryData(queryKey, profile);
      setSendError(null);
      toast.success(t('account.account.profile.saveSuccess'));
    },
    onError: () => {
      toast.danger(t('account.account.profile.saveError'));
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: () => accountApi.sendOtp('profile'),
    onSuccess: (response) => {
      setOtpSession({ ...response, sendError: null });
      setSendError(null);
    },
    onError: (error) => {
      const data = isAxiosError(error) ? error.response?.data as { code?: string; retryAfterSeconds?: number } | undefined : undefined;
      if (data?.code === 'OtpCooldownActive') {
        setOtpSession((current) => current
          ? {
              ...current,
              status: 'sending',
              cooldownSeconds: data.retryAfterSeconds ?? current.cooldownSeconds,
              sendError: t('account.account.phone.cooldown', { seconds: data.retryAfterSeconds ?? 60 }),
            }
          : current);
        setSendError(t('account.account.phone.cooldown', { seconds: data.retryAfterSeconds ?? 60 }));
        return;
      }

      const mappedError = mapSendOtpError(data?.code, t);
      setOtpSession((current) => current
        ? {
            ...current,
            status: 'failed',
            sendError: mappedError,
          }
        : current);
      setSendError(mappedError);
    },
  });

  const onSubmit = handleSubmit((values) => updateMutation.mutate(values));

  async function handleVerifyPhone() {
    if (sendOtpMutation.isPending) return;

    const isValid = await trigger('phoneNumber');
    if (!isValid) return;

    const phoneNumber = getValues('phoneNumber')?.trim();
    if (!phoneNumber) {
      setSendError(t('account.account.profile.noPhone'));
      return;
    }

    if (phoneNumber !== (profile?.phoneNumber ?? '')) {
      setSendError(t('account.account.profile.savePhoneBeforeVerify'));
      return;
    }

    setOtpSession({
      maskedPhone: maskPhoneForDisplay(phoneNumber),
      cooldownSeconds: 60,
      resendsRemaining: 3,
      status: 'sending',
      sendError: null,
    });
    setSendError(null);
    sendOtpMutation.mutate();
  }

  if (query.isError) {
    return (
      <QueryErrorState
        message={t('account.account.profile.loadError')}
        retryLabel={t('common.query.retry')}
        onRetry={() => void query.refetch()}
        error={query.error}
      />
    );
  }

  const profile = query.data;
  const savedPhone = profile?.phoneNumber ?? '';
  const currentPhone = watchedPhone?.trim() ?? savedPhone;
  const hasPhone = Boolean(currentPhone);
  const hasUnsavedPhoneChange = currentPhone !== savedPhone;
  const currentPhoneVerified = Boolean(
    profile?.phoneVerified
      && savedPhone
      && savedPhone === currentPhone,
  );

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          <UserRound className="size-5 text-primary" aria-hidden />
          {t('account.account.profile.title')}
        </h1>
        <p className="mt-1 text-sm text-default-500">{t('account.account.profile.subtitle')}</p>
      </div>

      <div className="content-surface p-6">
        <Form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField
            name="fullName"
            control={control}
            label={t('account.account.profile.nameLabel')}
            autoComplete="name"
            isRequired
            variant="bordered"
          />

          <FormField
            name="phoneNumber"
            control={control}
            label={t('account.account.profile.phoneLabel')}
            autoComplete="tel-national"
            placeholder="01012345678"
            description={t('account.account.profile.phoneHint')}
            variant="bordered"
          />

          <Button
            type="submit"
            variant="primary"
            isPending={updateMutation.isPending || query.isLoading}
            isDisabled={query.isLoading}
          >
            {t('account.account.profile.saveButton')}
          </Button>
        </Form>

        <div className="mt-6 space-y-3">
          {hasPhone ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* eslint-disable-next-line i18next/no-literal-string -- component status tokens, not user copy */}
                <Chip color={currentPhoneVerified ? 'success' : 'warning'} variant="soft">
                  {currentPhoneVerified
                    ? t('account.account.profile.verifiedBadge')
                    : t('account.account.profile.unverifiedBadge')}
                </Chip>
                {!currentPhoneVerified ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isPending={sendOtpMutation.isPending}
                    isDisabled={Boolean(otpSession) || hasUnsavedPhoneChange}
                    onPress={() => void handleVerifyPhone()}
                  >
                    <span className="inline-flex items-center gap-2">
                      <MessageCircle className="size-4" aria-hidden />
                      {t('account.account.profile.verifyViaWhatsApp')}
                    </span>
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="size-4" aria-hidden />
                    {profile?.phoneVerifiedAt
                      ? t('account.account.profile.verifiedAt', { date: new Date(profile.phoneVerifiedAt).toLocaleDateString() })
                      : t('account.account.profile.verifiedBadge')}
                  </span>
                )}
              </div>

              {hasUnsavedPhoneChange ? (
                <p className="text-sm text-warning">{t('account.account.profile.savePhoneBeforeVerify')}</p>
              ) : null}

              {sendError ? (
                // eslint-disable-next-line i18next/no-literal-string -- component status token, not user copy
                <Alert status="danger" role="alert" className="rounded-xl">
                  <Alert.Content>
                    <Alert.Description>{sendError}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {otpSession ? (
                <OtpEntryForm
                  key={`${otpSession.sessionId ?? otpSession.maskedPhone}:${otpSession.status}:${otpSession.sendError ?? ''}`}
                  // eslint-disable-next-line i18next/no-literal-string -- API purpose token, not user copy
                  purpose="profile"
                  sessionId={otpSession.sessionId}
                  maskedPhone={otpSession.maskedPhone}
                  initialCooldownSeconds={otpSession.cooldownSeconds}
                  initialResendsRemaining={otpSession.resendsRemaining}
                  initialSendStatus={otpSession.status}
                  initialSendError={otpSession.sendError}
                  onVerified={async () => {
                    setOtpSession(null);
                    await queryClient.invalidateQueries({ queryKey });
                    toast.success(t('account.account.phone.verifiedSuccess'));
                  }}
                />
              ) : null}
            </div>
          ) : (
            // eslint-disable-next-line i18next/no-literal-string -- component status token, not user copy
            <Alert status="warning" className="rounded-xl">
              <Alert.Content>
                <Alert.Description>{t('account.account.profile.noPhone')}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
        </div>
      </div>
    </section>
  );
}

function mapSendOtpError(code: string | undefined, t: (key: string, options?: Record<string, unknown>) => string) {
  switch (code) {
    case 'WhatsAppUnavailable':
      return t('account.account.phone.whatsappUnavailable');
    case 'OtpSessionLocked':
      return t('account.account.phone.locked');
    case 'NoPhoneOnFile':
      return t('account.account.checkout.noPhoneOnFile');
    default:
      return t('account.account.phone.errorUnknown');
  }
}

function maskPhoneForDisplay(phone: string) {
  if (phone.length <= 6) return phone;
  return `${phone.slice(0, 3)}${'*'.repeat(Math.max(0, phone.length - 6))}${phone.slice(-3)}`;
}
