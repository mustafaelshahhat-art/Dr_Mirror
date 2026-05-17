import { Button, Drawer } from '@heroui/react';
import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LinkButton } from '../../../shared/components/LinkButton';
import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';
import { useCart } from '../useCart';

import { CartLineRow } from './CartLineRow';

/**
 * Header cart entry-point — icon + count badge + drawer with the live cart
 * contents and sub-total. The drawer slides in from the trailing screen edge
 * (right in LTR, left in RTL).
 */
export function CartButton() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  const placement = i18n.dir(lang) === 'rtl' ? 'left' : 'right';
  const { cart, updateQuantity, removeItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  const visibleItems = cart.items;
  const hasItems = visibleItems.length > 0;

  return (
    <>
      {/* Drawer.Trigger renders its own <button>, so we drive open state
          manually to avoid the invalid nested-<button> markup it would create
          around our Button component. */}
      <Button
        variant="ghost"
        size="sm"
        aria-label={t('cart.openLabel')}
        className="relative"
        isIconOnly
        onPress={() => setIsOpen(true)}
      >
        <ShoppingBag className="size-5" aria-hidden />
        {cart.totalQuantity > 0 ? (
          <span
            className="absolute -end-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-none text-primary-foreground"
            aria-hidden
          >
            {cart.totalQuantity > 99 ? '99+' : cart.totalQuantity}
          </span>
        ) : null}
        <span className="sr-only">
          {t('cart.countSr', { count: cart.totalQuantity })}
        </span>
      </Button>

      <Drawer isOpen={isOpen} onOpenChange={setIsOpen}>

      <Drawer.Backdrop>
        <Drawer.Content placement={placement} className="w-full max-w-md">
          <Drawer.Dialog className="flex h-full flex-col">
            <Drawer.Header className="border-b border-divider/60 px-4 py-3">
              <Drawer.Heading className="text-base font-semibold">
                {t('cart.title')}
              </Drawer.Heading>
              <p className="mt-0.5 text-xs text-default-500">
                {t('cart.subtitle', { count: cart.totalQuantity })}
              </p>
            </Drawer.Header>

            <Drawer.Body className="flex-1 overflow-y-auto px-4 py-3">
              {cart.isLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-default-500">
                  {t('cart.loading')}
                </div>
              ) : hasItems ? (
                <div className="space-y-3">
                  {visibleItems.map((line) => (
                    <CartLineRow
                      key={line.id}
                      line={line}
                      onUpdate={(q) => void updateQuantity(line, q)}
                      onRemove={() => void removeItem(line)}
                      isMutating={cart.isMutating}
                      variant="compact"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm font-medium text-foreground">{t('cart.empty.title')}</p>
                  <p className="text-xs text-default-500">{t('cart.empty.subtitle')}</p>
                </div>
              )}
            </Drawer.Body>

            <Drawer.Footer className="border-t border-divider/60 px-4 py-3">
              <div className="mb-3 flex items-baseline justify-between text-sm">
                <span className="text-default-500">{t('cart.subTotal')}</span>
                <span className="text-base font-semibold tabular-nums text-foreground">
                  {formatCurrency(cart.subTotal, lang)}
                </span>
              </div>
              <div className="flex gap-2">
                {/* CloseTrigger renders its own native button — we style it
                    directly rather than nesting another <Button> inside, which
                    would produce invalid nested-buttons markup. */}
                <Drawer.CloseTrigger className="inline-flex flex-1 items-center justify-center rounded-medium border border-divider bg-content1 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-default-100">
                  {t('cart.continueShopping')}
                </Drawer.CloseTrigger>
                <LinkButton
                  to="/cart"
                  fullWidth
                  className="flex-1"
                >
                  {t('cart.viewCart')}
                </LinkButton>
              </div>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
      </Drawer>
    </>
  );
}
