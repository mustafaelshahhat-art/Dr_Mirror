import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import type { AxiosError } from 'axios';
import type { FormEvent } from 'react';
import { useEffect, useRef, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { StatusAlert } from '../../../shared/components/StatusAlert';

import type { SendOtpResponse, VerifyOtpResponse } from '../api';

/**
 * Seconds the user must wait between OTP sends. The backend does not expose a
 * cooldown value, so we enforce a client-side 60s window to discourage rapid
 * resends; the verify/expiry rules themselves stay backend-owned.
 */
const RESEND_COOLDOWN_SECONDS = 60;

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
      // Starting any send/resend clears the previously typed code: once a new
      // OTP is requested the backend invalidates the old one, so a stale code
      // left in the field would only ever fail verification.
      return { ...state, step: 'codeEntry', sendStatus: 'sending', code: '', error: null };
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

  // Seconds left before "Resend code" becomes clickable again. Driven by a
  // 1s interval that restarts every time a send succeeds.
  const [resendIn, setResendIn] = useState(0);

  // Auto-send-on-open guard. Reset to false when the modal closes so the next
  // open triggers exactly one auto-send. Combined with the open-transition
  // check below this is idempotent under re-renders / StrictMode double-invoke.
  const autoSentRef = useRef(false);

  // "Latest ref" for handleSend so the open effect can fire it without taking
  // sendOtp (an unstable inline prop in some callers) as a dependency — that
  // would otherwise re-run the effect every render and break once-per-open.
  const handleSendRef = useRef<(phoneOverride?: string) => Promise<void>>(undefined);

  // Holds the active cooldown interval so it can be cleared on restart/unmount.
  const resendTimerRef = useRef<number | null>(null);

  // Starts false so that even a mount-while-open counts as an open transition
  // (and therefore triggers exactly one auto-send).
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      // Opening: reset all modal state, then auto-send once if we already have
      // a phone on file (codeEntry). With no phone (the checkout "enter phone"
      // case) we wait for the user to type one — there is nothing to send yet.
      const masked = maskedPhone ?? null;
      dispatch({ type: 'OPEN', maskedPhone: masked });
      if (masked && !autoSentRef.current) {
        autoSentRef.current = true;
        void handleSendRef.current?.();
      }
    } else if (!isOpen && prevOpenRef.current) {
      // Closing: arm the guard for the next open.
      autoSentRef.current = false;
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, maskedPhone]);

  useEffect(() => {
    if (state.step === 'codeEntry') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state.step]);

  // Keep the auto-send ref pointed at the current handleSend closure. Done in an
  // effect (not during render) so it never reads/writes a ref while rendering.
  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  // Clear any pending cooldown timer when the component unmounts.
  useEffect(() => () => {
    if (resendTimerRef.current !== null) window.clearInterval(resendTimerRef.current);
  }, []);

  // Start (or restart) the resend cooldown. Invoked from handleSend after a
  // successful send — i.e. from an event/async flow, never synchronously from
  // an effect body — so it cannot trigger cascading effect renders.
  function startResendCountdown() {
    if (resendTimerRef.current !== null) window.clearInterval(resendTimerRef.current);
    setResendIn(RESEND_COOLDOWN_SECONDS);
    resendTimerRef.current = window.setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) {
          if (resendTimerRef.current !== null) window.clearInterval(resendTimerRef.current);
          resendTimerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function handleSend(phoneOverride?: string) {
    dispatch({ type: 'SEND_START' });
    try {
      const result = await sendOtp(phoneOverride ? { phone: phoneOverride } : undefined);
      dispatch({ type: 'SEND_SUCCESS', sessionId: result.sessionId, maskedPhone: result.maskedPhone });
      startResendCountdown();
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

  function mapVerifyError(code?: string | null): string {
    if (code === 'OTP_EXPIRED') return t('account.account.profile.otp.expired');
    if (code === 'OTP_TOO_MANY_ATTEMPTS') return t('account.account.profile.otp.tooManyAttempts');
    return t('account.account.profile.otp.invalid');
  }

  async function handleVerify() {
    if (!state.sessionId || state.code.length !== 6) return;
    dispatch({ type: 'VERIFY_START' });
    try {
      const result = await verifyOtp({ code: state.code, sessionId: state.sessionId });
      if (result.verified) {
        onVerified();
        return;
      }
      // Defensive: current API signals failure via a 400 (caught below); this
      // branch only fires if the backend ever returns 200 + verified:false.
      dispatch({ type: 'SET_ERROR', error: mapVerifyError(result.error) });
    } catch (err) {
      // Verify failures (wrong/expired/too-many) come back as HTTP 400, which
      // axios throws — the error code lives on the response body, not `result`.
      const axiosErr = err as AxiosError;
      const code = (axiosErr?.response?.data as { code?: string } | undefined)?.code;
      dispatch({ type: 'SET_ERROR', error: mapVerifyError(code) });
    } finally {
      dispatch({ type: 'VERIFY_DONE' });
    }
  }

  // Single source of truth for the modal's primary action. Pressing Enter in
  // either the phone field or the OTP field submits the form: in the phone
  // step it sends the code, in the code step it verifies — it never resends.
  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.step === 'enter') {
      void handleEnterAndSend();
      return;
    }
    void handleVerify();
  }

  const { step, sendStatus, code, phoneInput, isVerifying, error, currentMasked } = state;
  // Two independent loading states so verify and send never share UI feedback.
  const isSendingCode = sendStatus === 'sending';
  const blocking = isSendingCode || isVerifying;
  const codeSent = sendStatus === 'sent';
  const canVerify = codeSent && code.length === 6 && !isVerifying;
  // Resend is gated behind the cooldown so it can only fire once the timer ends.
  const canResend = codeSent && resendIn === 0 && !blocking;

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable={!blocking} onOpenChange={(open) => { if (!open) onClose(); }}>
        <Modal.Container size="sm">
          <Modal.Dialog>
            {() => (
              <form onSubmit={handleFormSubmit} noValidate>
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
                        <StatusAlert variant="info">
                          {t('account.account.profile.otp.sending')}
                        </StatusAlert>
                      ) : sendStatus === 'sent' ? (
                        <StatusAlert variant="success">
                          {t('account.account.profile.otp.sent')}
                        </StatusAlert>
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
                    <StatusAlert variant="danger">
                      {error}
                    </StatusAlert>
                  ) : null}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" size="sm" onPress={onClose} isDisabled={blocking}>
                    {t('common.cancel')}
                  </Button>
                  {step === 'enter' ? (
                    // Phone-entry step: the form's submit action sends the code.
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isPending={isSendingCode}
                      isDisabled={blocking || phoneInput.trim().length < 7}
                    >
                      {t('checkout.saveAndSendOtp')}
                    </Button>
                  ) : sendStatus === 'sendFailed' ? (
                    // Auto-send failed and there is no live code yet — the only
                    // action is to retry sending (never verify).
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isPending={isSendingCode}
                      isDisabled={blocking}
                      onPress={() => void handleSend()}
                    >
                      {t('account.account.profile.otp.retry')}
                    </Button>
                  ) : (
                    // Code-entry: Verify is the primary (submit) action; Resend is
                    // a separate, explicit secondary action gated by the cooldown.
                    // No "Send code" first-action button — the modal auto-sends.
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        isDisabled={!canResend}
                        onPress={() => void handleSend()}
                      >
                        {resendIn > 0
                          ? t('account.account.profile.otp.resendIn', { seconds: resendIn })
                          : t('account.account.profile.otp.resend')}
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isPending={isVerifying}
                        isDisabled={!canVerify}
                      >
                        {t('account.account.profile.otp.verifyButton')}
                      </Button>
                    </div>
                  )}
                </Modal.Footer>
              </form>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return '*'.repeat(phone.length);
  return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
}
