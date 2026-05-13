import { Route, Routes } from 'react-router-dom';

import { LoginPage } from '../features/auth/LoginPage';
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from '../features/auth/ProtectedRoute';
import { RegisterPage } from '../features/auth/RegisterPage';
import { Layout } from '../shared/components/Layout';
import { ShellPage } from '../shared/components/ShellPage';

/**
 * App route tree.
 *   Public (only when signed-out): /login, /register
 *   Protected (signed-in):         /  (the app shell)
 *
 * Both gates render a centered spinner while AuthProvider's initial
 * /auth/refresh handshake is in flight, so a valid session never briefly
 * flashes the login page on reload.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<ShellPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
