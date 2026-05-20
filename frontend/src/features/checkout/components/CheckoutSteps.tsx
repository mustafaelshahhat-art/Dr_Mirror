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
        const isCurrent = idx === currentIndex;
        return (
          <li
            key={step}
            className={`flex items-center gap-1.5 sm:gap-2 ${isLast ? 'shrink-0' : 'flex-1'}`}
          >
            <span
              aria-current={isCurrent ? 'step' : undefined}
              className={[
                'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 sm:size-9',
                completed
                  ? 'bg-brand text-brand-foreground'
                  : isCurrent
                    ? 'bg-brand text-brand-foreground ring-4 ring-brand/20'
                    : 'bg-default-200 text-muted',
              ].join(' ')}
            >
              {completed ? <Check className="size-3.5" aria-hidden /> : idx + 1}
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
                  'h-0.5 flex-1 rounded-full transition-colors duration-300',
                  idx < currentIndex ? 'bg-brand/40' : 'bg-divider/60',
                ].join(' ')}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
