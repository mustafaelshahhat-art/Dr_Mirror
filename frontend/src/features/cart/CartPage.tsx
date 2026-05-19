import { Alert, Button, Card, Heading, Paragraph, Separator } from '@heroui/react';
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
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-default-500 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('cart.backToCatalog')}
      </Link>

      <header className="space-y-1">
        <Heading className="text-2xl font-semibold tracking-tight">{t('cart.title')}</Heading>
        <Paragraph className="text-sm text-default-500">
          {t('cart.subtitle', { count: cart.totalQuantity })}
        </Paragraph>
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

          <Card className="h-fit lg:sticky lg:top-20">
            <Card.Header>
              <Heading level={2} className="text-sm font-semibold uppercase tracking-wide text-default-600">
                {t('cart.summary')}
              </Heading>
            </Card.Header>
            <Card.Content className="space-y-4">
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
              {/* Separator per Anatomy A.21; maps border-t border-divider purely-visual separator */}
              <Separator />
              <div className="pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-default-500">{t('cart.estimatedTotal')}</span>
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {formatCurrency(cart.subTotal, lang)}
                  </span>
                </div>
              </div>
            </Card.Content>
            <Card.Footer>
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
