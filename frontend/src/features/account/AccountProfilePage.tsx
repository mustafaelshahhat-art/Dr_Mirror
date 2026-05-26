import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, useOverlayState } from '@heroui/react';
import { toast } from '@heroui/react/toast';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { FormField } from '../auth/components/FormField';
import { PhoneVerificationModal, maskPhone } from '../auth/components/PhoneVerificationModal';
import { useAuth } from '../auth/useAuth';

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'account.account.profile.errors.nameRequired').max(120, 'account.account.profile.errors.nameTooLong'),
  phone: z.string().trim().max(30, 'account.account.profile.errors.phoneTooLong'),
  email: z.string().trim().email('account.account.profile.errors.emailInvalid').max(254, 'account.account.profile.errors.emailTooLong').min(1, 'account.account.profile.errors.emailRequired'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function AccountProfilePage() {
  const { t } = useTranslation();
  const { user, updateProfile, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const otpState = useOverlayState({ defaultOpen: false });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: user?.fullName ?? '', phone: user?.phone ?? '', email: user?.email ?? '' },
  });

  useEffect(() => {
    reset({ displayName: user?.fullName ?? '', phone: user?.phone ?? '', email: user?.email ?? '' });
  }, [reset, user?.fullName, user?.phone, user?.email]);

  if (!user) return null;

  const phoneValue = watch('phone');
  const phoneChanged = phoneValue.trim() !== (user.phone ?? '');
  const phoneUnverified = !user.phoneNumberConfirmed && Boolean(user.phone);

  const onSubmit = handleSubmit(async (values) => {
    const trimmedEmail = values.email.trim();
    const trimmedPhone = values.phone.trim() || null;
    await updateProfile({
      displayName: values.displayName.trim(),
      phone: trimmedPhone,
      email: trimmedEmail !== user.email ? trimmedEmail : undefined,
    });
    toast.success(t('account.account.profile.saved'));
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {t('account.account.profile.title')}
      </h1>

      <div className="content-surface p-6">
        <Form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField
            name="displayName"
            control={control}
            label={t('account.account.profile.name')}
            autoComplete="name"
            isRequired
            variant="bordered"
          />
          <FormField
            name="email"
            control={control}
            label={t('account.account.profile.email')}
            type="email"
            autoComplete="email"
            isRequired
            variant="bordered"
          />
          <FormField
            name="phone"
            control={control}
            label={t('account.account.profile.phone')}
            autoComplete="tel"
            variant="bordered"
          />

          {/* Phone verification status */}
          {user.phone && !phoneChanged && (
            <div className="flex items-center gap-2 rounded-medium bg-default-100 p-3 text-sm">
              {user.phoneNumberConfirmed ? (
                <>
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                  <span className="text-success">{t('account.account.profile.phoneVerified')}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4 shrink-0 text-warning" aria-hidden />
                  <span className="text-warning-600">{t('account.account.profile.phoneNotVerified')}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="ms-auto"
                    onPress={otpState.open}
                  >
                    {t('account.account.profile.verifyPhone')}
                  </Button>
                </>
              )}
            </div>
          )}

          {phoneChanged && user.phone && (
            <p className="text-xs text-default-500">{t('account.account.profile.phoneSaveToVerify')}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" isDisabled={!isDirty || isSubmitting} onPress={() => reset()}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" isDisabled={!isDirty || isSubmitting} isPending={isSubmitting}>
              {t('account.account.profile.save')}
            </Button>
          </div>
        </Form>
      </div>

      {/* Phone OTP verification modal */}
      {phoneUnverified && (
        <PhoneVerificationModal
          isOpen={otpState.isOpen}
          onClose={otpState.close}
          maskedPhone={maskPhone(user.phone ?? '')}
          sendOtp={() => sendPhoneOtp({ purpose: 'profile' })}
          verifyOtp={verifyPhoneOtp}
          onVerified={() => {
            otpState.close();
            toast.success(t('account.account.profile.phoneVerifiedSuccess'));
          }}
        />
      )}
    </div>
  );
}

