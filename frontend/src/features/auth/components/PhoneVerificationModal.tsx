import { Alert, Button, Input, Label, Modal, TextField } from '@heroui/react';
import type { AxiosError } from 'axios';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SendOtpResponse, VerifyOtpResponse } from '../api';

export interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  maskedPhone?: string;
  sendOtp: (input?: { phone?: string }) => Promise<SendOtpResponse>;
  verifyOtp: (input: { code: string; sessionId: string }) => Promise<VerifyOtpResponse>;
  onVerified: () => void;
}

type Step = 'enter' | 'send' | 'verify';

export function PhoneVerificationModal({
  isOpen,
  onClose,
  maskedPhone,
  sendOtp,
  verifyOtp,
  onVerified,
}: PhoneVerificationModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(maskedPhone ? 'send' : 'enter');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMasked, setCurrentMasked] = useState(maskedPhone ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(maskedPhone ? 'send' : 'enter');
      setSessionId(null);
      setCode('');
      setPhoneInput('');
      setError(null);
      setCurrentMasked(maskedPhone ?? '');
    }
  }, [isOpen, maskedPhone]);

  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  async function handleSend(phoneOverride?: string) {
    setIsSending(true);
    setError(null);
    try {
      const result = await sendOtp(phoneOverride ? { phone: phoneOverride } : undefined);
      setSessionId(result.sessionId);
      setCurrentMasked(result.maskedPhone ?? '');
      setStep('verify');
    } catch (err) {
      const axiosErr = err as AxiosError;
      const data = axiosErr?.response?.data as { code?: string } | undefined;
      if (data?.code === 'NO_PHONE_ON_FILE') {
        setStep('enter');
        setError(t('checkout.phoneRequired'));
      } else if (axiosErr?.response?.status === 503) {
        setError(t('account.account.profile.otp.whatsappUnavailable'));
      } else {
        setError(t('account.account.profile.otp.sendFailed'));
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleEnterAndSend() {
    const cleaned = phoneInput.replace(/\s/g, '');
    if (cleaned.length < 7) {
      setError(t('checkout.errors.phoneInvalid'));
      return;
    }
    await handleSend(cleaned);
  }

  async function handleVerify() {
    if (!sessionId || code.length !== 6) return;
    setIsVerifying(true);
    setError(null);
    try {
      const result = await verifyOtp({ code, sessionId });
      if (result.verified) {
        onVerified();
      } else {
        const errCode = result.error;
        if (errCode === 'OTP_EXPIRED') setError(t('account.account.profile.otp.expired'));
        else if (errCode === 'OTP_TOO_MANY_ATTEMPTS') setError(t('account.account.profile.otp.tooManyAttempts'));
        else setError(t('account.account.profile.otp.invalid'));
      }
    } catch {
      setError(t('account.account.profile.otp.invalid'));
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable={!isSending && !isVerifying} onOpenChange={(open) => { if (!open) onClose(); }}>
        <Modal.Container size="sm">
          <Modal.Dialog>
            {() => (
              <>
                <Modal.Header>
                  <Modal.Heading>{step === 'enter' ? t('checkout.phoneTitle') : t('account.account.profile.otp.title')}</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="space-y-4">
                  {step === 'enter' ? (
                    <>
                      <p className="text-sm text-default-600">
                        {t('checkout.phoneRequiredDescription')}
                      </p>
                      <TextField
                        value={phoneInput}
                        onChange={(v: string) => { setPhoneInput(v); setError(null); }}
                        isInvalid={Boolean(error)}
                        className="flex flex-col gap-1.5"
                      >
                        <Label className="text-sm font-medium">{t('checkout.address.phone')}</Label>
                        <Input
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="+20 100 000 0000"
                          className="border border-default-400 dark:border-default-300"
                        />
                      </TextField>
                    </>
                  ) : step === 'send' ? (
                    <p className="text-sm text-default-600">
                      {t('account.account.profile.otp.sendDescription', { phone: currentMasked })}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-default-600">
                        {t('account.account.profile.otp.enterDescription', { phone: currentMasked })}
                      </p>
                      <TextField
                        value={code}
                        onChange={(v: string) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                        isInvalid={Boolean(error)}
                        className="flex flex-col gap-1.5"
                      >
                        <Label className="text-sm font-medium">{t('account.account.profile.otp.codeLabel')}</Label>
                        <Input
                          ref={inputRef}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          className="border border-default-400 text-center font-mono text-lg tracking-widest dark:border-default-300"
                        />
                      </TextField>
                    </>
                  )}

                  {error ? (
                    // eslint-disable-next-line i18next/no-literal-string
                    <Alert status="danger" role="alert">
                      <Alert.Content>
                        <Alert.Description>{error}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  ) : null}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" size="sm" onPress={onClose} isDisabled={isSending || isVerifying}>
                    {t('common.cancel')}
                  </Button>
                  {step === 'enter' ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isPending={isSending}
                      isDisabled={isSending || phoneInput.trim().length < 7}
                      onPress={() => void handleEnterAndSend()}
                    >
                      {t('checkout.saveAndSendOtp')}
                    </Button>
                  ) : step === 'send' ? (
                    <Button type="button" variant="primary" size="sm" isPending={isSending} isDisabled={isSending} onPress={() => void handleSend()}>
                      {t('account.account.profile.otp.sendButton')}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" isDisabled={isVerifying || isSending} onPress={() => void handleSend()}>
                        {t('account.account.profile.otp.resend')}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isPending={isVerifying}
                        isDisabled={isVerifying || code.length !== 6}
                        onPress={() => void handleVerify()}
                      >
                        {t('account.account.profile.otp.verifyButton')}
                      </Button>
                    </div>
                  )}
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return '*'.repeat(phone.length);
  return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
}
