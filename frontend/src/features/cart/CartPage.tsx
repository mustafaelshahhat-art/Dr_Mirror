import { Button } from '@heroui/react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';

import { CartLineRow } from './components/CartLineRow';
import { useCart } from './useCart';

/**
 * Full-page cart at <c>/cart</c>. Open to everyone — guests see their
 * localStorage cart, authed buyers see the server cart projected through
 * the same view shape.
 */
export function CartPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const { cart, updateQuantity, removeItem, clear, mergeError, retryMerge } = useCart();

  const hasItems = cart.items.length > 0;
  const errorMessage = cart.error?.message;

  return (
    <section className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-default-500 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('cart.backToCatalog')}
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('cart.title')}</h1>
        <p className="text-sm text-default-500">
          {t('cart.subtitle', { count: cart.totalQuantity })}
        </p>
      </header>

      {mergeError ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-medium border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
        >
          <span>{mergeError}</span>
          <button
            type="button"
            onClick={() => void retryMerge()}
            className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
          >
            {t('cart.retryMerge')}
          </button>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-medium border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
        >
          {errorMessage}
        </div>
      ) : null}

      {cart.isLoading ? (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center text-sm text-default-500">
          {t('cart.loading')}
        </div>
      ) : hasItems ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {cart.items.map((line) => (
              <CartLineRow
                key={line.id}
                line={line}
                onUpdate={(q) => void updateQuantity(line, q)}
                onRemove={() => void removeItem(line)}
                isMutating={cart.isMutating}
              />
            ))}
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onPress={() => void clear()}
                isDisabled={cart.isMutating}
              >
                {t('cart.clear')}
              </Button>
            </div>
          </div>

          <aside className="h-fit space-y-4 rounded-large border border-divider/60 bg-content1 p-4 lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-default-600">
              {t('cart.summary')}
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-default-500">{t('cart.subTotal')}</dt>
                <dd className="tabular-nums">{formatCurrency(cart.subTotal, lang)}</dd>
              </div>
              <div className="flex justify-between text-xs text-default-500">
                <dt>{t('cart.shippingNote')}</dt>
                <dd>{t('cart.calculatedAtCheckout')}</dd>
              </div>
            </dl>
            <div className="border-t border-divider/60 pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-default-500">{t('cart.estimatedTotal')}</span>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {formatCurrency(cart.subTotal, lang)}
                </span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="block w-full rounded-medium bg-foreground px-4 py-2.5 text-center text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {t('cart.proceedToCheckout')}
            </Link>
          </aside>
        </div>
      ) : (
        <div className="rounded-large border border-divider/60 bg-content1 p-10 text-center">
          <ShoppingBag
            className="mx-auto mb-3 size-10 text-default-400"
            aria-hidden
          />
          <h2 className="text-base font-semibold">{t('cart.empty.title')}</h2>
          <p className="mt-1 text-sm text-default-500">{t('cart.empty.subtitle')}</p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center justify-center rounded-medium bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {t('cart.empty.cta')}
          </Link>
        </div>
      )}
    </section>
  );
}
