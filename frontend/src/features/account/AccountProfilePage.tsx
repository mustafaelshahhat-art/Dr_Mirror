import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, Modal, useOverlayState } from '@heroui/react';
import { toast } from '@heroui/react/toast';
import { CheckCircle2, ShieldAlert, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  const { user, updateProfile, deletePhone, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const otpState = useOverlayState({ defaultOpen: false });
  const deleteConfirmState = useOverlayState({ defaultOpen: false });
  const [isDeletingPhone, setIsDeletingPhone] = useState(false);

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

  const handleDeletePhone = async () => {
    setIsDeletingPhone(true);
    try {
      await deletePhone();
      toast.success(t('account.account.profile.phoneDeleted'));
      deleteConfirmState.close();
      reset({ displayName: user.fullName, phone: '', email: user.email });
    } catch {
      toast.danger(t('account.account.profile.phoneDeleteError'));
    } finally {
      setIsDeletingPhone(false);
    }
  };

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
            <div className="flex items-center justify-between gap-2">
              {user.phoneNumberConfirmed ? (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-success-50 px-3 py-2 text-sm font-medium text-success-700">
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                  {t('account.account.profile.phoneVerified')}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <ShieldAlert className="size-4 shrink-0 text-warning" aria-hidden />
                  <span className="text-warning-600">{t('account.account.profile.phoneNotVerified')}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onPress={otpState.open}
                  >
                    {t('account.account.profile.verifyPhone')}
                  </Button>
                </div>
              )}
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="shrink-0"
                isDisabled={isDeletingPhone}
                onPress={deleteConfirmState.open}
              >
                <Trash2 className="size-4" aria-hidden />
                <span>{t('account.account.profile.deletePhone')}</span>
              </Button>
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

      {/* Delete phone confirmation modal */}
      <Modal>
        <Modal.Backdrop isOpen={deleteConfirmState.isOpen} isDismissable={!isDeletingPhone} onOpenChange={(open) => { if (!open) deleteConfirmState.close(); }}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              {() => (
                <>
                  <Modal.Header>
                    <Modal.Heading>{t('account.account.profile.deletePhoneTitle')}</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <p className="text-sm text-default-600">{t('account.account.profile.deletePhoneConfirm')}</p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button type="button" variant="ghost" size="sm" isDisabled={isDeletingPhone} onPress={deleteConfirmState.close}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="button" variant="danger" size="sm" isPending={isDeletingPhone} isDisabled={isDeletingPhone} onPress={handleDeletePhone}>
                      {t('account.account.profile.deletePhoneConfirmButton')}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

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

