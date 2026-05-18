import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type CheckoutStep = 'address' | 'payment' | 'review';

const ORDER: CheckoutStep[] = ['address', 'payment', 'review'];

/**
 * Three-dot progress indicator above the checkout form. Pure presentation —
 * the active step is passed in by <c>CheckoutPage</c>.
 */
export function CheckoutSteps({ current }: { current: CheckoutStep }) {
  const { t } = useTranslation();
  const currentIndex = ORDER.indexOf(current);

  return (
    <ol className="flex w-full items-center gap-2">
      {ORDER.map((step, idx) => {
        const reached = idx <= currentIndex;
        const isLast = idx === ORDER.length - 1;
        const completed = idx < currentIndex;
        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <span
              aria-current={idx === currentIndex ? 'step' : undefined}
              className={[
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                completed
                  ? 'border-success bg-success text-success-foreground'
                  : reached
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-divider bg-content1 text-default-500',
              ].join(' ')}
            >
              {completed ? <Check className="size-3.5" aria-hidden /> : idx + 1}
            </span>
            <span
              className={[
                'text-xs font-medium',
                reached ? 'text-foreground' : 'text-default-500',
              ].join(' ')}
            >
              {t(`checkout.steps.${step}`)}
            </span>
            {!isLast ? (
              <span
                aria-hidden
                className={[
                  'h-px flex-1',
                  idx < currentIndex ? 'bg-success/50' : 'bg-divider',
                ].join(' ')}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
