import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@heroui/react';

import { useAuth } from './useAuth';
import { resolvePostAuthDestination } from './postAuthDestination';

export function ProtectedRoute() {
  const { user, isBootstrapping, isAdmin } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner aria-label="Loading session..." />
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
  const { isBootstrapping, isAdmin } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner aria-label="Loading session..." />
      </div>
    );
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner aria-label="Loading session..." />
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
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner aria-label="Loading session..." />
      </div>
    );
  }

  if (user) {
    const dest = resolvePostAuthDestination(user, null);
    return <Navigate to={dest} replace />;
  }

  return <Outlet />;
}
