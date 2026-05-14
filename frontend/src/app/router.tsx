import { Route, Routes } from 'react-router-dom';

import { AdminHubPage } from '../features/admin/AdminHubPage';
import { AdminOrderDetailPage } from '../features/admin/AdminOrderDetailPage';
import { AdminOrdersListPage } from '../features/admin/AdminOrdersListPage';
import { AdminCategoriesPage } from '../features/admin/catalog/AdminCategoriesPage';
import { AdminPaymentMethodsPage } from '../features/admin/catalog/AdminPaymentMethodsPage';
import { AdminProductCreatePage } from '../features/admin/catalog/AdminProductCreatePage';
import { AdminProductEditPage } from '../features/admin/catalog/AdminProductEditPage';
import { AdminProductsListPage } from '../features/admin/catalog/AdminProductsListPage';
import { LoginPage } from '../features/auth/LoginPage';
import {
  AdminRoute,
  ProtectedRoute,
  PublicOnlyRoute,
} from '../features/auth/ProtectedRoute';
import { RegisterPage } from '../features/auth/RegisterPage';
import { CartPage } from '../features/cart/CartPage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ProductDetailPage } from '../features/catalog/ProductDetailPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { OrderDetailPage } from '../features/orders/OrderDetailPage';
import { OrdersListPage } from '../features/orders/OrdersListPage';
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
        <Route path="cart" element={<CartPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="account" element={<ShellPage />} />
          <Route path="account/orders" element={<OrdersListPage />} />
          <Route path="account/orders/:orderNumber" element={<OrderDetailPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="admin" element={<AdminHubPage />} />
          <Route path="admin/orders" element={<AdminOrdersListPage />} />
          <Route path="admin/orders/:orderNumber" element={<AdminOrderDetailPage />} />
          <Route path="admin/categories" element={<AdminCategoriesPage />} />
          <Route path="admin/products" element={<AdminProductsListPage />} />
          <Route path="admin/products/new" element={<AdminProductCreatePage />} />
          <Route path="admin/products/:id/edit" element={<AdminProductEditPage />} />
          <Route path="admin/payment-methods" element={<AdminPaymentMethodsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
