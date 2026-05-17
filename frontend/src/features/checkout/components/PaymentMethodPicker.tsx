import { Radio, RadioGroup } from '@heroui/react';
import { Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
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

  if (sorted.length === 0) {
    return (
      <p className="rounded-medium border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
        {t('checkout.payment.noMethods')}
      </p>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{t('checkout.payment.heading')}</legend>
      <RadioGroup
        aria-label={t('checkout.payment.heading')}
        value={selectedId ?? ''}
        onChange={onSelect}
        className="space-y-2"
      >
        {sorted.map((method) => {
          const name = isAr ? method.nameAr : method.nameEn;
          const instructions = isAr ? method.instructionsAr : method.instructionsEn;
          const Icon = iconForKind(method.kind);
          return (
            <Radio
              key={method.id}
              value={method.id}
              className={({ isFocusVisible, isSelected }) => [
                'flex w-full cursor-pointer items-start gap-3 rounded-medium border p-3 text-start transition-colors',
                isFocusVisible ? 'outline outline-2 outline-offset-2 outline-primary' : '',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-divider bg-content1 hover:bg-content2',
              ].filter(Boolean).join(' ')}
            >
              {({ isSelected }) => (
                <>
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
                </>
              )}
            </Radio>
          );
        })}
      </RadioGroup>
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
