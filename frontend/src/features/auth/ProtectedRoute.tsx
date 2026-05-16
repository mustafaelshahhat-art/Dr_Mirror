import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { useAuth } from './useAuth';
import { resolvePostAuthDestination } from './postAuthDestination';

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
    return <Navigate to="/admin" replace />;
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
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
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

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user.roles.includes('Admin')) {
    return <Navigate to="/" replace />;
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

  return next;
}
