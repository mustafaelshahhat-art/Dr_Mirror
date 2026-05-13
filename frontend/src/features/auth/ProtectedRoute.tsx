import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@heroui/react';

import { useAuth } from './useAuth';

/**
 * Gate for authenticated routes. While the session-restore handshake is in
 * flight (page reload, cold open) we render a centered spinner — never the
 * underlying page — so cookie-backed sessions don't briefly flash the login
 * screen before rehydrating.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner aria-label="Loading session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the URL the user was trying to reach so we can bounce them back after login.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

/**
 * Gate for staff-only routes. Requires both an authenticated session AND the
 * "Admin" role on the user. Buyers without the role get bounced to the
 * catalog landing rather than the login page (they're not anonymous — they
 * just lack permission). Mirrors the backend's <c>RequireRole(Admin)</c> on
 * every /api/admin/* endpoint.
 */
export function AdminRoute() {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner aria-label="Loading session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.roles.includes('Admin')) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/**
 * The inverse: redirect to home if a logged-in user lands on /login or /register.
 */
export function PublicOnlyRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner aria-label="Loading session..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
