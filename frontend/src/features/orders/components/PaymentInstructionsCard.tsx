import { Button } from '@heroui/react';
import { Banknote, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';
import type { OrderDetailDto } from '../types';

/**
 * Buyer-facing payment-method card shown on the order detail page for
 * Instapay / Wallet / BankTransfer orders while they're <c>Pending</c> or
 * <c>PendingPaymentReview</c>. Displays the receiving account number + a
 * copy-to-clipboard button + the amount due.
 */
export function PaymentInstructionsCard({ order }: { order: OrderDetailDto }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const isAr = lang === 'ar';
  const [copied, setCopied] = useState(false);

  const instructions = isAr ? order.paymentInstructionsAr : order.paymentInstructionsEn;
  const accountNumber = order.paymentAccountNumber;
  const accountHolder = order.paymentAccountHolder;

  async function copyToClipboard(value: string | null) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable — silent fail is fine */
    }
  }

  return (
    <section
      aria-labelledby="payment-instructions-heading"
      className="space-y-3 rounded-large border border-primary/30 bg-primary/5 p-4"
    >
      <header className="flex items-center gap-2">
        <Banknote className="size-5 text-primary" aria-hidden />
        <h2
          id="payment-instructions-heading"
          className="text-sm font-semibold text-foreground"
        >
          {t('orders.paymentInstructions.heading')}
        </h2>
      </header>

      <p className="text-sm leading-relaxed text-default-700 dark:text-default-300">
        {instructions ?? t('orders.paymentInstructions.fallback')}
      </p>

      <dl className="grid gap-2 rounded-medium border border-divider/60 bg-content1 p-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-default-500">
            {t('orders.paymentInstructions.amount')}
          </dt>
          <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
            {formatCurrency(order.total, lang)}
          </dd>
        </div>
        {accountNumber ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-default-500">
              {t('orders.paymentInstructions.accountNumber')}
            </dt>
            <dd className="mt-0.5 flex items-center gap-2">
              <span className="font-mono text-sm text-foreground" dir="ltr">
                {accountNumber}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onPress={() => void copyToClipboard(accountNumber)}
                aria-label={t('orders.paymentInstructions.copy')}
                className="border border-divider/60 bg-content2 text-xs text-default-700 hover:bg-default-100"
              >
                <span className="inline-flex items-center gap-1">
                  <Copy className="size-3" aria-hidden />
                  {copied ? t('orders.paymentInstructions.copied') : t('orders.paymentInstructions.copy')}
                </span>
              </Button>
            </dd>
          </div>
        ) : null}
        {accountHolder ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-default-500">
              {t('orders.paymentInstructions.accountHolder')}
            </dt>
            <dd className="mt-0.5 text-sm text-foreground">{accountHolder}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
