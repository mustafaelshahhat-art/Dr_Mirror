import { Route, Routes } from 'react-router-dom';

import { LoginPage } from '../features/auth/LoginPage';
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from '../features/auth/ProtectedRoute';
import { RegisterPage } from '../features/auth/RegisterPage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ProductDetailPage } from '../features/catalog/ProductDetailPage';
import { Layout } from '../shared/components/Layout';
import { ShellPage } from '../shared/components/ShellPage';

/**
 * App route tree.
 *
 *   Auth pages (no shell, public-only):
 *     /login, /register
 *
 *   Public pages (shared shell, anonymous-friendly):
 *     /                  → catalog landing
 *     /products/:slug    → product detail
 *
 *   Protected pages (shared shell, requires sign-in):
 *     /account           → buyer account dashboard
 *
 * The auth gates render a centered spinner while AuthProvider's initial
 * /auth/refresh handshake is in flight, so reloads never flash the wrong page.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="account" element={<ShellPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
