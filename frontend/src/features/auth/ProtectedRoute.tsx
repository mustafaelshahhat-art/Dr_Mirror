import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { useAuth } from './useAuth';
import { resolvePostAuthDestination } from './postAuthDestination';
import { setForbiddenMessage } from '../../shared/lib/forbidden-store';

export function ProtectedRoute() {
  const { t } = useTranslation();
  const { user, isBootstrapping, isAdmin } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner aria-label={t('loading.session')} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isAdmin) {
    return (
      <ForbiddenRedirect
        to="/admin"
        message={t('admin.shell.forbidden.buyerOnly')}
      />
    );
  }

  return <Outlet />;
}

export function CustomerRoute() {
  const { t } = useTranslation();
  const { isBootstrapping, isAdmin } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner aria-label={t('loading.session')} />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <ForbiddenRedirect
        to="/admin"
        message={t('admin.shell.forbidden.buyerOnly')}
      />
    );
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { t } = useTranslation();
  const { user, isBootstrapping, isAdmin } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner aria-label={t('loading.session')} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return (
      <ForbiddenRedirect
        to="/"
        message={t('admin.shell.forbidden.adminOnly')}
      />
    );
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { t } = useTranslation();
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner aria-label={t('loading.session')} />
      </div>
    );
  }

  if (user) {
    const dest = resolvePostAuthDestination(user, getSafeNextPath(location.search));
    return <Navigate to={dest} replace />;
  }

  return <Outlet />;
}

function getSafeNextPath(search: string): string | null {
  const next = new URLSearchParams(search).get('next');

  if (next === null || !next.startsWith('/') || next.startsWith('//')) return null;
  if (next === '/login' || next === '/register') return null;

  return next;
}

function ForbiddenRedirect({ to, message }: { to: string; message: string }) {
  useEffect(() => {
    setForbiddenMessage(message);
  }, [message]);

  return <Navigate to={to} replace />;
}
