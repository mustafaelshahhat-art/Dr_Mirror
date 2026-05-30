import { Home, ShoppingCart, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';

interface MobileBottomNavProps {
  onAccountPress?: () => void;
}

const itemClass = (isActive: boolean) =>
  `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors focus:outline-none ${
    isActive ? 'text-brand' : 'text-default-500 hover:text-foreground'
  }`;

export function MobileBottomNav({ onAccountPress }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const { pathname } = location;

  // Home owns the storefront: the catalog root and product/category browsing.
  const isHomeActive = pathname === '/' || pathname.startsWith('/products');
  const isCartActive = pathname === '/cart' || pathname.startsWith('/cart/');
  const isAccountActive = pathname === '/account' || pathname.startsWith('/account/');

  return (
    <nav
      aria-label={t('common.mobileNav.label')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-divider/60 bg-background/95 backdrop-blur-sm sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex h-14 items-center justify-around">
        <li>
          <Link to="/" className={itemClass(isHomeActive)}>
            <Home className="size-5" aria-hidden />
            <span>{t('common.mobileNav.home')}</span>
          </Link>
        </li>
        <li>
          <Link to="/cart" className={itemClass(isCartActive)}>
            <ShoppingCart className="size-5" aria-hidden />
            <span>{t('common.mobileNav.cart')}</span>
          </Link>
        </li>
        <li>
          {user ? (
            <button
              type="button"
              onClick={onAccountPress}
              className={`${itemClass(isAccountActive)} w-full cursor-pointer`}
            >
              <User className="size-5" aria-hidden />
              <span>{t('common.mobileNav.account')}</span>
            </button>
          ) : (
            <NavLink to="/login" className={({ isActive }) => itemClass(isActive)}>
              <User className="size-5" aria-hidden />
              <span>{t('common.mobileNav.signIn')}</span>
            </NavLink>
          )}
        </li>
      </ul>
    </nav>
  );
}
