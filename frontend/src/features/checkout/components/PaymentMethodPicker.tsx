import { Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react';
import type { ComponentType, KeyboardEvent, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';

import { PAYMENT_METHOD_KIND, type PaymentMethodDto } from '../../orders/types';

interface PaymentMethodPickerProps {
  methods: PaymentMethodDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Radiogroup-style picker for the active payment methods returned by
 * <c>/api/checkout/payment-methods</c>. Each option shows an icon, the
 * locale-aware name, and the instructions string from the backend.
 */
export function PaymentMethodPicker({
  methods,
  selectedId,
  onSelect,
}: PaymentMethodPickerProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const sorted = [...methods].sort((a, b) => a.displayOrder - b.displayOrder);
  const selectedMethodIdx = sorted.findIndex((m) => m.id === selectedId);

  if (sorted.length === 0) {
    return (
      <p className="rounded-medium border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
        {t('checkout.payment.noMethods')}
      </p>
    );
  }

  const isRtl = i18n.dir() === 'rtl';

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const len = sorted.length;
    if (len === 0) return;
    const current = selectedMethodIdx === -1 ? 0 : selectedMethodIdx;
    // The list is vertical, so Up/Down map directly. Horizontal arrows are
    // also accepted as a courtesy and are direction-aware so RTL keyboards
    // stay consistent with reading order.
    const forwardKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const backwardKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === forwardKey) { e.preventDefault(); next = (current + 1) % len; }
    else if (e.key === 'ArrowUp' || e.key === backwardKey) { e.preventDefault(); next = (current - 1 + len) % len; }
    else if (e.key === 'Home') { e.preventDefault(); next = 0; }
    else if (e.key === 'End') { e.preventDefault(); next = len - 1; }
    if (next !== -1) onSelect(sorted[next].id);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{t('checkout.payment.heading')}</legend>
      <div role="radiogroup" className="space-y-2" onKeyDown={handleKeyDown}>
        {sorted.map((method, idx) => {
          const isSelected = method.id === selectedId;
          const name = isAr ? method.nameAr : method.nameEn;
          const instructions = isAr ? method.instructionsAr : method.instructionsEn;
          const Icon = iconForKind(method.kind);
          const tabIdx = selectedMethodIdx === -1 ? (idx === 0 ? 0 : -1) : isSelected ? 0 : -1;
          return (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={tabIdx}
              onClick={() => onSelect(method.id)}
              className={[
                'flex w-full items-start gap-3 rounded-medium border p-3 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-divider bg-content1 hover:bg-content2',
              ].join(' ')}
            >
              <Icon
                className={[
                  'mt-0.5 size-5 shrink-0',
                  isSelected ? 'text-primary' : 'text-default-500',
                ].join(' ')}
                aria-hidden
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{name}</p>
                {instructions ? (
                  <p className="mt-0.5 text-xs text-default-500">{instructions}</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function iconForKind(kind: PaymentMethodDto['kind']): ComponentType<SVGProps<SVGSVGElement>> {
  switch (kind) {
    case PAYMENT_METHOD_KIND.Cod:
      return Banknote;
    case PAYMENT_METHOD_KIND.Instapay:
      return Smartphone;
    case PAYMENT_METHOD_KIND.Wallet:
      return Wallet;
    case PAYMENT_METHOD_KIND.BankTransfer:
    default:
      return CreditCard;
  }
}
