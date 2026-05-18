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

export function getSafeNextPath(search: string): string | null {
  const raw = new URLSearchParams(search).get('next');
  if (raw === null) return null;

  // Reject anything that didn't come in as a plain in-app path.
  if (!raw.startsWith('/')) return null;

  // Single-decode percent escapes so attempts like %2F%2Fevil.com or
  // %2f%2fevil.com are detected. Anything that fails to decode (malformed
  // sequences) is rejected outright.
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }

  // Protocol-relative / backslash-relative redirects can navigate off-origin.
  if (decoded.startsWith('//') || decoded.startsWith('/\\')) return null;

  // Scheme-relative redirects like "/path?to=http://evil.com" are fine, but
  // a `://` substring on a leading-decoded path is a strong signal of an
  // attacker-controlled host smuggled through additional encoding layers.
  if (/^[^?#]*:\/\//.test(decoded)) return null;

  if (decoded === '/login' || decoded === '/register') return null;

  return decoded;
}

function ForbiddenRedirect({ to, message }: { to: string; message: string }) {
  useEffect(() => {
    setForbiddenMessage(message);
  }, [message]);

  return <Navigate to={to} replace />;
}
