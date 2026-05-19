import { Alert, Button, Card, Separator } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { formatCurrency } from '../../shared/lib/format';
import type { AppLang } from '../../shared/lib/theme-storage';
import { CartLineSkeleton } from '../../shared/components/Skeleton';
import { EmptyState } from '../../shared/components/EmptyState';

import { CartLineRow } from './components/CartLineRow';
import { useCart } from './useCart';

/**
 * Full-page cart at <c>/cart</c>. Open to everyone — guests see their
 * localStorage cart, authed buyers see the server cart projected through
 * the same view shape.
 */
export function CartPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const { cart, updateQuantity, removeItem, clear, mergeError, retryMerge } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);

  const hasItems = cart.items.length > 0;
  const errorMessage = cart.error?.message;

  return (
    <section className="space-y-8">
      <Link to="/" className="back-link">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('cart.backToCatalog')}
      </Link>

      <header className="page-header">
        <h1 className="page-title">{t('cart.title')}</h1>
        <p className="page-subtitle">
          {t('cart.subtitle', { count: cart.totalQuantity })}
        </p>
      </header>

      {mergeError ? (
        <Alert status="danger" role="alert">
          <Alert.Content>
            <Alert.Description>{mergeError}</Alert.Description>
          </Alert.Content>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => void retryMerge()}
            className="shrink-0 text-danger"
          >
            {t('cart.retryMerge')}
          </Button>
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert status="danger" role="alert">
          <Alert.Content>
            <Alert.Description>{errorMessage}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {cart.isLoading ? (
        <div
          className="grid gap-6 lg:grid-cols-[1fr_320px]"
          aria-busy="true"
          aria-label={t('cart.loading')}
        >
          <span className="sr-only">{t('cart.loading')}</span>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CartLineSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : hasItems ? (
        <div
          className="grid gap-6 lg:grid-cols-[1fr_320px]"
          aria-busy={cart.isMutating}
        >
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
              {confirmClear ? (
                <div className="inline-flex flex-wrap items-center gap-2 rounded-medium border border-danger/30 bg-danger/10 p-2">
                  <span className="text-sm text-danger">{t('cart.clearConfirm')}</span>
                  <Button
                    variant="danger"
                    size="sm"
                    onPress={() => {
                      setConfirmClear(false);
                      void clear();
                    }}
                    isDisabled={cart.isMutating}
                  >
                    {t('cart.clearConfirmYes')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => setConfirmClear(false)}
                    isDisabled={cart.isMutating}
                  >
                    {t('cart.clearConfirmNo')}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setConfirmClear(true)}
                  isDisabled={cart.isMutating}
                >
                  {t('cart.clear')}
                </Button>
              )}
            </div>
          </div>

          <Card className="h-fit border border-divider/60 lg:sticky lg:top-20">
            <Card.Header className="border-b border-divider/40 px-5 pb-3 pt-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t('cart.summary')}
              </h2>
            </Card.Header>
            <Card.Content className="space-y-4 px-5 py-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">{t('cart.subTotal')}</dt>
                  <dd className="tabular-nums">{formatCurrency(cart.subTotal, lang)}</dd>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <dt>{t('cart.shippingNote')}</dt>
                  <dd>{t('cart.calculatedAtCheckout')}</dd>
                </div>
              </dl>
              {/* Separator per Anatomy A.21; maps border-t border-divider purely-visual separator */}
              <Separator />
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-sm font-medium text-muted">{t('cart.estimatedTotal')}</span>
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {formatCurrency(cart.subTotal, lang)}
                </span>
              </div>
            </Card.Content>
            <Card.Footer className="px-5 pb-5 pt-1">
              <Link
                to="/checkout"
                className={buttonVariants({ variant: 'primary', fullWidth: true })}
              >
                {t('cart.proceedToCheckout')}
              </Link>
            </Card.Footer>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={ShoppingBag}
          title={t('cart.empty.title')}
          subtitle={t('cart.empty.subtitle')}
          action={{ label: t('cart.empty.cta'), onPress: () => void navigate('/') }}
        />
      )}
    </section>
  );
}
