import { Spinner } from '@heroui/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../../auth/useAuth';

/**
 * Hidden behind <ProtectedRoute> too, but the cart page links into /checkout
 * directly so we double-guard: spinner while the session bootstraps, redirect
 * to /login when we know the visitor isn't authed.
 */
export function CheckoutAuthGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner aria-label={t('checkout.loading')} />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: { pathname: '/checkout' } }} replace />;
  }

  return <>{children}</>;
}
