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
    <ol className="flex w-full items-center gap-1 sm:gap-2">
      {ORDER.map((step, idx) => {
        const reached = idx <= currentIndex;
        const isLast = idx === ORDER.length - 1;
        const completed = idx < currentIndex;
        return (
          <li key={step} className="flex flex-1 items-center gap-1.5 sm:gap-2">
            <span
              aria-current={idx === currentIndex ? 'step' : undefined}
              className={[
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:size-7',
                completed
                  ? 'bg-success text-success-foreground'
                  : reached
                    ? 'bg-brand text-white'
                    : 'border border-divider bg-surface text-muted',
              ].join(' ')}
            >
              {completed ? <Check className="size-3" aria-hidden /> : idx + 1}
            </span>
            <span
              className={[
                'hidden text-xs font-medium sm:block',
                reached ? 'text-foreground' : 'text-muted',
              ].join(' ')}
            >
              {t(`checkout.steps.${step}`)}
            </span>
            {!isLast ? (
              <span
                aria-hidden
                className={[
                  'h-px flex-1',
                  idx < currentIndex ? 'bg-success/40' : 'bg-divider/60',
                ].join(' ')}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
