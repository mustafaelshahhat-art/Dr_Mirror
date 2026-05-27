import { Alert, Button, Input, Label, Modal, TextField } from '@heroui/react';
import type { AxiosError } from 'axios';
import { useEffect, useRef, useReducer } from 'react';
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

type Step = 'enter' | 'codeEntry';
type SendStatus = 'idle' | 'sending' | 'sent' | 'sendFailed';

interface OtpState {
  step: Step;
  sendStatus: SendStatus;
  sessionId: string | null;
  code: string;
  phoneInput: string;
  isVerifying: boolean;
  error: string | null;
  currentMasked: string;
}

type OtpAction =
  | { type: 'OPEN'; maskedPhone: string | null }
  | { type: 'SEND_START' }
  | { type: 'SEND_SUCCESS'; sessionId: string; maskedPhone: string | null }
  | { type: 'SEND_NO_PHONE' }
  | { type: 'SEND_FAILURE'; error: string }
  | { type: 'SET_PHONE_INPUT'; value: string }
  | { type: 'SET_CODE'; value: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'VERIFY_START' }
  | { type: 'VERIFY_DONE' };

function initOtpState(maskedPhone: string | null): OtpState {
  return {
    step: maskedPhone ? 'codeEntry' : 'enter',
    sendStatus: 'idle',
    sessionId: null,
    code: '',
    phoneInput: '',
    isVerifying: false,
    error: null,
    currentMasked: maskedPhone ?? '',
  };
}

function otpReducer(state: OtpState, action: OtpAction): OtpState {
  switch (action.type) {
    case 'OPEN':
      return initOtpState(action.maskedPhone);
    case 'SEND_START':
      return { ...state, step: 'codeEntry', sendStatus: 'sending', error: null };
    case 'SEND_SUCCESS':
      return { ...state, sessionId: action.sessionId, currentMasked: action.maskedPhone ?? state.currentMasked, sendStatus: 'sent' };
    case 'SEND_NO_PHONE':
      return { ...state, step: 'enter', sendStatus: 'idle' };
    case 'SEND_FAILURE':
      return { ...state, sendStatus: 'sendFailed', error: action.error };
    case 'SET_PHONE_INPUT':
      return { ...state, phoneInput: action.value, error: null };
    case 'SET_CODE':
      return { ...state, code: action.value.replace(/\D/g, '').slice(0, 6), error: null };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'VERIFY_START':
      return { ...state, isVerifying: true, error: null };
    case 'VERIFY_DONE':
      return { ...state, isVerifying: false };
  }
}

export function PhoneVerificationModal({
  isOpen,
  onClose,
  maskedPhone,
  sendOtp,
  verifyOtp,
  onVerified,
}: PhoneVerificationModalProps) {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(otpReducer, maskedPhone ?? null, initOtpState);
  const inputRef = useRef<HTMLInputElement>(null);

  const prevOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      dispatch({ type: 'OPEN', maskedPhone: maskedPhone ?? null });
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, maskedPhone]);

  useEffect(() => {
    if (state.step === 'codeEntry') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state.step]);

  async function handleSend(phoneOverride?: string) {
    dispatch({ type: 'SEND_START' });
    try {
      const result = await sendOtp(phoneOverride ? { phone: phoneOverride } : undefined);
      dispatch({ type: 'SEND_SUCCESS', sessionId: result.sessionId, maskedPhone: result.maskedPhone });
    } catch (err) {
      const axiosErr = err as AxiosError;
      const data = axiosErr?.response?.data as { code?: string } | undefined;
      if (data?.code === 'NO_PHONE_ON_FILE') {
        dispatch({ type: 'SEND_NO_PHONE' });
        dispatch({ type: 'SET_ERROR', error: t('checkout.phoneRequired') });
      } else if (axiosErr?.response?.status === 503) {
        dispatch({ type: 'SEND_FAILURE', error: t('account.account.profile.otp.whatsappUnavailable') });
      } else {
        dispatch({ type: 'SEND_FAILURE', error: t('account.account.profile.otp.sendFailed') });
      }
    }
  }

  async function handleEnterAndSend() {
    const cleaned = state.phoneInput.replace(/\s/g, '');
    if (cleaned.length < 7) {
      dispatch({ type: 'SET_ERROR', error: t('checkout.errors.phoneInvalid') });
      return;
    }
    await handleSend(cleaned);
  }

  async function handleVerify() {
    if (!state.sessionId || state.code.length !== 6) return;
    dispatch({ type: 'VERIFY_START' });
    try {
      const result = await verifyOtp({ code: state.code, sessionId: state.sessionId });
      if (result.verified) {
        onVerified();
      } else {
        const errCode = result.error;
        if (errCode === 'OTP_EXPIRED') dispatch({ type: 'SET_ERROR', error: t('account.account.profile.otp.expired') });
        else if (errCode === 'OTP_TOO_MANY_ATTEMPTS') dispatch({ type: 'SET_ERROR', error: t('account.account.profile.otp.tooManyAttempts') });
        else dispatch({ type: 'SET_ERROR', error: t('account.account.profile.otp.invalid') });
      }
    } catch {
      dispatch({ type: 'SET_ERROR', error: t('account.account.profile.otp.invalid') });
    } finally {
      dispatch({ type: 'VERIFY_DONE' });
    }
  }

  const { step, sendStatus, code, phoneInput, isVerifying, error, currentMasked } = state;
  const blocking = sendStatus === 'sending' || isVerifying;
  const sendDone = sendStatus === 'sent';
  const canVerify = sendDone && code.length === 6 && !isVerifying;

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable={!blocking} onOpenChange={(open) => { if (!open) onClose(); }}>
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
                        onChange={(v: string) => dispatch({ type: 'SET_PHONE_INPUT', value: v })}
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
                  ) : (
                    <>
                      <p className="text-sm text-default-600">
                        {sendStatus === 'idle' || sendStatus === 'sendFailed'
                          ? t('account.account.profile.otp.sendDescription', { phone: currentMasked })
                          : t('account.account.profile.otp.enterDescription', { phone: currentMasked })}
                      </p>

                      {sendStatus === 'sending' ? (
                        <Alert status="default" role="status">
                          <Alert.Content>
                            <Alert.Description>{t('account.account.profile.otp.sending')}</Alert.Description>
                          </Alert.Content>
                        </Alert>
                      ) : sendStatus === 'sent' ? (
                        <Alert status="success" role="status">
                          <Alert.Content>
                            <Alert.Description>{t('account.account.profile.otp.sent')}</Alert.Description>
                          </Alert.Content>
                        </Alert>
                      ) : null}

                      <TextField
                        value={code}
                        onChange={(v: string) => dispatch({ type: 'SET_CODE', value: v })}
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
                    <Alert status="danger" role="alert">
                      <Alert.Content>
                        <Alert.Description>{error}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  ) : null}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" size="sm" onPress={onClose} isDisabled={blocking}>
                    {t('common.cancel')}
                  </Button>
                  {step === 'enter' ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isPending={sendStatus === 'sending'}
                      isDisabled={blocking || phoneInput.trim().length < 7}
                      onPress={() => void handleEnterAndSend()}
                    >
                      {t('checkout.saveAndSendOtp')}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      {sendStatus === 'sendFailed' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          isDisabled={blocking}
                          onPress={() => void handleSend()}
                        >
                          {t('account.account.profile.otp.retry')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          isDisabled={blocking}
                          onPress={() => void handleSend()}
                        >
                          {sendStatus === 'idle' ? t('account.account.profile.otp.sendButton') : t('account.account.profile.otp.resend')}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isPending={isVerifying}
                        isDisabled={!canVerify}
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
