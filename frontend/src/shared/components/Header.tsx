import { Button, Drawer, Link, Separator, Surface } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { LogOut, Menu, Plus, ShoppingBag, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { CartButton } from '../../features/cart/components/CartButton';
import { useCart } from '../../features/cart/useCart';

import { LangSwitcher } from './LangSwitcher';
import { ThemeToggle } from './ThemeToggle';

/**
 * Global header — hosts the brand link, auth-aware account/sign-in entry,
 * LangSwitcher, ThemeToggle, and CartButton. Sticky, low-noise.
 *
 * On narrow screens (< sm) all secondary controls collapse into a HeroUI
 * Drawer reached via a single hamburger button. The visible row stays at
 * brand + cart + menu with comfortable 44 px touch targets.
 *
 * Mobile nav drawer opens from the LEADING edge (right in RTL, left in LTR)
 * which is the universal convention for navigation drawers. The cart drawer
 * remains on the TRAILING edge so the two never clash.
 *
 * Approved Composition Component: Surface + Button + Drawer + Link + Separator.
 */
export function Header() {
  const { t, i18n } = useTranslation();
  const { user, logout, isBootstrapping, isAdmin } = useAuth();
  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigation drawer: leading edge (left in LTR, right in RTL)
  const navPlacement = i18n.dir() === 'rtl' ? 'right' : 'left';

  if (isAdmin) return null;

  return (
    <header role="banner">
      <Surface
        variant="transparent"
        className="sticky top-0 z-40 border-b border-divider/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-bold tracking-tight transition-opacity hover:opacity-75 sm:text-lg"
          >
            {/* Medical cross brand mark */}
            <span
              className="flex size-7 items-center justify-center rounded-md bg-brand text-white"
              aria-hidden
            >
              <Plus className="size-4" />
            </span>
            {t('appName')}
          </Link>

          {/* Desktop row */}
          <nav
            aria-label={t('header.menuLabel')}
            className="hidden items-center gap-1 sm:flex"
          >
            <Link
              href="/"
              className="rounded-medium px-3 py-2 text-sm font-medium text-default-700 transition-colors hover:bg-default-100 hover:text-foreground dark:text-default-300 dark:hover:bg-default-50/10"
            >
              {t('header.catalog')}
            </Link>

            <Link
              href="/inquiries"
              className="rounded-medium px-3 py-2 text-sm font-medium text-default-700 transition-colors hover:bg-default-100 hover:text-foreground dark:text-default-300 dark:hover:bg-default-50/10"
            >
              {t('header.contact')}
            </Link>

            <Separator orientation="vertical" className="mx-1 h-5" />

            {!isBootstrapping && user ? (
              <>
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 rounded-medium px-3 py-2 text-sm font-medium text-default-700 transition-colors hover:bg-default-100 hover:text-foreground dark:text-default-300 dark:hover:bg-default-50/10"
                >
                  <UserIcon className="size-4 shrink-0" aria-hidden />
                  <span className="max-w-28 truncate">{user.fullName}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => void logout()}
                  aria-label={t('auth.signOut')}
                  className="text-default-600 dark:text-default-400"
                >
                  {t('auth.signOut')}
                </Button>
              </>
            ) : null}

            {!isBootstrapping && !user ? (
              <Link
                href="/login"
                className={`${buttonVariants({ variant: 'primary', size: 'sm' })} ms-1`}
              >
                {t('header.signIn')}
              </Link>
            ) : null}

            <div className="ms-1 flex items-center gap-1">
              <CartButton />
              <LangSwitcher />
              <ThemeToggle />
            </div>
          </nav>

          {/* Mobile row — brand + cart + hamburger. All 44 px touch targets. */}
          <div className="flex items-center gap-2 sm:hidden">
            <CartButton />
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={t('header.openMenu')}
              aria-expanded={menuOpen}
              onPress={() => setMenuOpen(true)}
              className="size-11 min-w-0"
            >
              <Menu className="size-5" aria-hidden />
            </Button>
          </div>
        </div>
      </Surface>

      {/* Mobile navigation drawer — leading edge (left/LTR, right/RTL).
          Sibling of Surface to keep the portal outside the sticky stacking context. */}
      <Drawer isOpen={menuOpen} onOpenChange={setMenuOpen}>
        <Drawer.Backdrop className="bg-foreground/40">
          <Drawer.Content
            placement={navPlacement}
            className="w-72 max-w-[85vw]"
          >
            <Drawer.Dialog className="flex h-full flex-col">
              <Drawer.Header className="flex items-center justify-between gap-2 border-b border-divider/60 px-4 py-4">
                <Link
                  href="/"
                  onPress={() => setMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-bold tracking-tight"
                >
                  <span
                    className="flex size-6 items-center justify-center rounded-md bg-brand text-white"
                    aria-hidden
                  >
                    <Plus className="size-3.5" />
                  </span>
                  {t('appName')}
                </Link>
                <Drawer.CloseTrigger aria-label={t('common.dismiss')} />
              </Drawer.Header>

              <Drawer.Body className="flex-1 overflow-y-auto px-3 py-4">
                {/* Navigation links */}
                <nav aria-label={t('header.menuLabel')} className="space-y-0.5">
                  <RouterLink
                    to="/"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-medium px-3 py-2.5 text-sm font-medium text-default-700 transition-colors hover:bg-default-100 dark:text-default-300 dark:hover:bg-default-50/10"
                  >
                    {t('header.catalog')}
                  </RouterLink>

                  <RouterLink
                    to="/inquiries"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-medium px-3 py-2.5 text-sm font-medium text-default-700 transition-colors hover:bg-default-100 dark:text-default-300 dark:hover:bg-default-50/10"
                  >
                    {t('header.contact')}
                  </RouterLink>

                  {!isBootstrapping && user ? (
                    <>
                      <RouterLink
                        to="/account"
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-11 items-center gap-3 rounded-medium px-3 py-2.5 text-sm font-medium text-default-700 transition-colors hover:bg-default-100 dark:text-default-300 dark:hover:bg-default-50/10"
                      >
                        <UserIcon className="size-4 shrink-0" aria-hidden />
                        <span className="truncate">{user.fullName}</span>
                      </RouterLink>
                      <RouterLink
                        to="/account/orders"
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-11 items-center gap-3 rounded-medium px-3 py-2.5 text-sm font-medium text-default-700 transition-colors hover:bg-default-100 dark:text-default-300 dark:hover:bg-default-50/10"
                      >
                        {t('header.myOrders')}
                      </RouterLink>
                    </>
                  ) : null}

                  {!isBootstrapping && !user ? (
                    <RouterLink
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-medium px-3 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-brand/5"
                    >
                      {t('header.signIn')}
                    </RouterLink>
                  ) : null}
                </nav>

                <Separator orientation="horizontal" className="my-4" />

                {/* Cart shortcut */}
                <RouterLink
                  to="/cart"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-medium px-3 py-2.5 text-sm font-medium text-default-700 transition-colors hover:bg-default-100 dark:text-default-300 dark:hover:bg-default-50/10"
                >
                  <span className="flex items-center gap-3">
                    <ShoppingBag className="size-4 shrink-0" aria-hidden />
                    {t('header.cartCount', { count: cart.totalQuantity })}
                  </span>
                  {cart.totalQuantity > 0 ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white tabular-nums">
                      {cart.totalQuantity > 99 ? '99+' : cart.totalQuantity}
                    </span>
                  ) : null}
                </RouterLink>

                <Separator orientation="horizontal" className="my-4" />

                {/* Utility controls */}
                <div className="space-y-1 px-1">
                  <div className="flex min-h-11 items-center justify-between gap-3 rounded-medium px-2 py-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-default-500">
                      {t('header.switchLanguage')}
                    </span>
                    <LangSwitcher />
                  </div>
                  <div className="flex min-h-11 items-center justify-between gap-3 rounded-medium px-2 py-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-default-500">
                      {t('header.switchTheme')}
                    </span>
                    <ThemeToggle />
                  </div>
                </div>
              </Drawer.Body>

              {!isBootstrapping && user ? (
                <Drawer.Footer className="border-t border-divider/60 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
                  <Button
                    variant="ghost"
                    fullWidth
                    onPress={() => {
                      setMenuOpen(false);
                      void logout();
                    }}
                    aria-label={t('auth.signOut')}
                    className="text-default-600 dark:text-default-400"
                  >
                    <span className="inline-flex items-center gap-2">
                      <LogOut className="size-4 rtl:rotate-180" aria-hidden />
                      {t('auth.signOut')}
                    </span>
                  </Button>
                </Drawer.Footer>
              ) : null}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </header>
  );
}
