import { Home, Store, ShoppingCart, Package, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';

const NAV_ITEMS = [
  { to: '/', icon: Home, labelKey: 'common.mobileNav.home', end: true },
  { to: '/', icon: Store, labelKey: 'common.mobileNav.shop', end: true },
  { to: '/cart', icon: ShoppingCart, labelKey: 'common.mobileNav.cart', end: false },
  { to: '/account/orders', icon: Package, labelKey: 'common.mobileNav.orders', end: true },
] as const;

interface MobileBottomNavProps {
  onAccountPress?: () => void;
}

export function MobileBottomNav({ onAccountPress }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <nav
      aria-label={t('common.mobileNav.label')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-divider/60 bg-background/95 backdrop-blur-sm sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex h-14 items-center justify-around">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey, end }) => (
          <li key={labelKey}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-brand'
                    : 'text-default-500 hover:text-foreground'
                }`
              }
            >
              <Icon className="size-5" aria-hidden />
              <span>{t(labelKey)}</span>
            </NavLink>
          </li>
        ))}
        <li>
          {user ? (
            <button
              type="button"
              onClick={onAccountPress}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors text-default-500 hover:text-foreground cursor-pointer focus:outline-none w-full"
            >
              <User className="size-5" aria-hidden />
              <span>{t('common.mobileNav.account')}</span>
            </button>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-brand'
                    : 'text-default-500 hover:text-foreground'
                }`
              }
            >
              <User className="size-5" aria-hidden />
              <span>{t('common.mobileNav.signIn')}</span>
            </NavLink>
          )}
        </li>
      </ul>
    </nav>
  );
}
