import { Button, Drawer } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { formatCurrency } from '../../../shared/lib/format';
import type { AppLang } from '../../../shared/lib/theme-storage';
import { useCart } from '../useCart';

import { CartLineRow } from './CartLineRow';

/**
 * Header cart entry-point — icon + count badge + drawer with the live cart
 * contents and sub-total. The drawer slides in from the trailing screen edge
 * (right in LTR, left in RTL) — opposite side from the navigation drawer.
 *
 * Empty-state includes an icon, copy, and a "Browse catalog" CTA that closes
 * the drawer and navigates to the catalog root.
 *
 * Safe-area-inset is applied to the drawer footer so the CTA is not obscured
 * by iPhone notch / Android gesture nav.
 */
export function CartButton() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as AppLang;
  // Cart drawer always slides in from the physical LEFT edge of the viewport,
  // regardless of document direction. In LTR this sits opposite the cart icon
  // (which renders on the right of the header); in RTL it lands on the same
  // side as the icon. Per product direction.
  const { cart, updateQuantity, removeItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  const visibleItems = cart.items;
  const hasItems = visibleItems.length > 0;
  const showCount = cart.totalQuantity > 0;
  const countLabel = cart.totalQuantity > 99 ? '99+' : String(cart.totalQuantity);

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      aria-label={t('cart.openLabel')}
      isIconOnly
      onPress={() => setIsOpen(true)}
      /* Minimum 44px touch target on mobile */
      className="size-11 min-w-0"
    >
      <ShoppingBag className="size-5" aria-hidden />
      <span className="sr-only">
        {t('cart.countSr', { count: cart.totalQuantity })}
      </span>
    </Button>
  );

  return (
    <>
      <div className="relative inline-flex">
        {trigger}
        {showCount ? (
          <span
            className="absolute -end-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white tabular-nums shadow-sm outline outline-2 outline-background"
            aria-hidden
          >
            {countLabel}
          </span>
        ) : null}
      </div>

      <Drawer isOpen={isOpen} onOpenChange={setIsOpen}>
        {/* bg-foreground/40 gives a semi-transparent scrim so the page behind
            remains partially visible — not fully blacked out. */}
        <Drawer.Backdrop className="bg-foreground/40">
          <Drawer.Content placement="left">
            <Drawer.Dialog className="flex h-full w-[72vw] max-w-sm flex-col p-0 sm:w-[26rem]">
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
                  /* Empty state — icon + copy + CTA */
                  <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-default-100 dark:bg-default-50/5">
                      <ShoppingBag className="size-8 text-default-400" aria-hidden />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{t('cart.empty.title')}</p>
                      <p className="text-xs text-default-500">{t('cart.empty.subtitle')}</p>
                    </div>
                    <Link
                      to="/"
                      onClick={() => setIsOpen(false)}
                      className={buttonVariants({ variant: 'primary', size: 'sm' })}
                    >
                      {t('cart.empty.cta')}
                    </Link>
                  </div>
                )}
              </Drawer.Body>

              <Drawer.Footer
                className="flex flex-col items-stretch gap-3 border-t border-divider/60 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"
              >
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-default-500">{t('cart.subTotal')}</span>
                  <span className="text-base font-semibold tabular-nums text-foreground">
                    {formatCurrency(cart.subTotal, lang)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {/* Use a proper Button with onPress instead of Drawer.CloseTrigger
                      to avoid raw class-string styling and keep design-system consistency.
                      We already control isOpen manually, so no nested-button issue arises. */}
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onPress={() => setIsOpen(false)}
                  >
                    {t('cart.continueShopping')}
                  </Button>
                  <Link
                    to="/cart"
                    onClick={() => setIsOpen(false)}
                    className={`${buttonVariants({ variant: 'primary' })} flex-1`}
                  >
                    {t('cart.viewCart')}
                  </Link>
                </div>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  );
}
