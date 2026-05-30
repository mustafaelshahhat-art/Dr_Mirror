import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  LogOut as LogOutIcon,
  Package as PackageIcon,
  User as UserIcon,
  RotateCcw as RotateCcwIcon,
  MapPin as MapPinIcon,
  Lock as LockIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface AccountSheetUser {
  fullName: string;
  email: string;
}

interface AccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  user: AccountSheetUser;
  onNavigate: (to: string) => void;
  onSignOut: () => void;
}

/**
 * Non-modal mobile account menu.
 *
 * Deliberately NOT a HeroUI Drawer/Modal: it does not trap focus, does not set
 * `inert`/`aria-hidden` on siblings, and never applies global body/html locks
 * (`overflow: hidden` / `pointer-events: none`). The overlay is driven purely by
 * `isOpen` and conditionally rendered, so once closed it unmounts entirely —
 * leaving no backdrop or pointer-events layer behind that could block taps. No
 * timeouts or manual DOM cleanup are involved.
 *
 * Closes on: outside (backdrop) click, Escape, route change, and menu item click.
 * The entrance animation is pure CSS (tw-animate-css) so no effect-driven state
 * machine is needed; closing unmounts immediately.
 */
export function AccountSheet({ isOpen, onClose, user, onNavigate, onSignOut }: AccountSheetProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;

  // Self-close when the route actually changes (covers browser back/forward and
  // any navigation that didn't originate from a menu tap). Calls the `onClose`
  // prop — never a local setState — so it stays a clean external sync.
  const prevRouteRef = useRef(routeKey);
  useEffect(() => {
    if (prevRouteRef.current !== routeKey) {
      prevRouteRef.current = routeKey;
      onClose();
    }
  }, [routeKey, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initials = (user.fullName ?? '')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

  const menuItems = [
    { to: '/account?tab=personal-data', icon: UserIcon, label: t('account.account.tabs.personalData') },
    { to: '/account?tab=orders', icon: PackageIcon, label: t('account.account.tabs.orders') },
    { to: '/account?tab=returns', icon: RotateCcwIcon, label: t('account.account.tabs.returns') },
    { to: '/account?tab=addresses', icon: MapPinIcon, label: t('account.account.tabs.addresses') },
    { to: '/account?tab=security', icon: LockIcon, label: t('account.account.tabs.security') },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[60] sm:hidden">
      {/* Backdrop — clicking it unmounts the whole overlay, so no lock lingers. */}
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      />
      <div
        role="dialog"
        aria-modal="false"
        aria-label={t('common.accountMenu.account')}
        className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-divider/60 bg-background pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom duration-200 ease-out"
      >
        {/* Grabber handle */}
        <div className="mx-auto my-3 h-1.5 w-12 rounded-full bg-default-300 dark:bg-default-700" />

        <div className="px-5 py-3">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-base font-bold text-brand">
              {initials}
            </span>
            <div className="min-w-0 flex-1 text-start">
              <p className="truncate text-base font-bold leading-tight text-foreground">{user.fullName}</p>
              <p className="mt-1 truncate text-sm leading-tight text-muted" dir="ltr">
                {user.email}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-0.5 px-3 py-2">
          {menuItems.map(({ to, icon: Icon, label }) => (
            <button
              key={to}
              type="button"
              onClick={() => onNavigate(to)}
              className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-start text-sm font-medium text-default-700 transition-all hover:bg-default-100 hover:text-foreground active:scale-[0.98] cursor-pointer"
            >
              <Icon className="size-5 text-default-500" aria-hidden />
              <span>{label}</span>
            </button>
          ))}

          <div className="mx-4 my-2 h-[1px] bg-divider/60" />

          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-start text-sm font-semibold text-danger transition-all hover:bg-danger-50 dark:hover:bg-danger-950/20 active:scale-[0.98] cursor-pointer"
          >
            <LogOutIcon className="size-5 text-danger/80" aria-hidden />
            <span>{t('common.accountMenu.signOut')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
