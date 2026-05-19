import { Card } from '@heroui/react';
import { Banknote } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Snippet } from '../../../shared/components/Snippet';
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

  const instructions = isAr ? order.paymentInstructionsAr : order.paymentInstructionsEn;
  const accountNumber = order.paymentAccountNumber;
  const accountHolder = order.paymentAccountHolder;

  return (
    <Card
      aria-labelledby="payment-instructions-heading"
      className="border-primary/30 bg-primary/5"
    >
      <Card.Header className="flex flex-row items-center gap-2">
        <Banknote className="size-5 text-primary" aria-hidden />
        <h2
          id="payment-instructions-heading"
          className="text-sm font-semibold text-foreground"
        >
          {t('orders.paymentInstructions.heading')}
        </h2>
      </Card.Header>

      <Card.Content className="space-y-3">
        <p className="text-sm leading-relaxed text-default-700 dark:text-default-300">
          {instructions ?? t('orders.paymentInstructions.fallback')}
        </p>

        <Card variant="default" className="bg-content1">
          <Card.Content>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
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
                  <dd className="mt-0.5">
                    <Snippet
                      value={accountNumber}
                      aria-label={t('orders.paymentInstructions.copy')}
                      text={t('orders.paymentInstructions.copy')}
                      copiedText={t('orders.paymentInstructions.copied')}
                      tooltipPlacement="top"
                    >
                      <span className="font-mono text-sm text-foreground" dir="ltr">
                        {accountNumber}
                      </span>
                    </Snippet>
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
          </Card.Content>
        </Card>
      </Card.Content>
    </Card>
  );
}
