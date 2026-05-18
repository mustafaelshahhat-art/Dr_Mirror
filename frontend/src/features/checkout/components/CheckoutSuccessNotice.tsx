import { useEffect, useRef } from 'react';
import { toast } from '@heroui/react/toast';
import { useTranslation } from 'react-i18next';

import type { AddressSaveOutcome } from '../../orders/types';

type Translate = (key: string) => string;

interface CheckoutSuccessNoticeProps {
  outcome: AddressSaveOutcome | undefined;
}

/**
 * Fires a single HeroUI warning toast when the checkout-create response
 * returned <c>"skipped_book_full"</c>. The order still went through — this
 * just tells the buyer their address book is full so they can prune and
 * resave later. Renders nothing.
 */
export function CheckoutSuccessNotice({ outcome }: CheckoutSuccessNoticeProps) {
  const { t } = useTranslation();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!fireAddressSaveOutcomeToast(outcome, t)) return;
    firedRef.current = true;
  }, [outcome, t]);

  return null;
}

/**
 * Side-effect helper used by both the component and the imperative
 * <c>CheckoutPage.onSubmit</c> path. Returns <c>true</c> when a toast was
 * actually emitted so callers can avoid double-firing.
 */
export function fireAddressSaveOutcomeToast(
  outcome: AddressSaveOutcome | undefined,
  t: Translate,
): boolean {
  if (outcome !== 'skipped_book_full') return false;
  try {
    toast.warning(t('checkout.addressNotSavedTitle'), {
      description: t('checkout.addressNotSavedBody'),
    });
    return true;
  } catch {
    // ToastProvider unavailable during early boot.
    return false;
  }
}
