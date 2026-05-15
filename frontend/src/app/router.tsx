import { Route, Routes } from 'react-router-dom';

import { AdminHubPage } from '../features/admin/AdminHubPage';
import { AdminInquiriesPage } from '../features/admin/AdminInquiriesPage';
import { AdminUsersPage } from '../features/admin/AdminUsersPage';
import { AdminOrderDetailPage } from '../features/admin/AdminOrderDetailPage';
import { AdminOrdersListPage } from '../features/admin/AdminOrdersListPage';
import { AdminCategoriesPage } from '../features/admin/catalog/AdminCategoriesPage';
import { AdminPaymentMethodsPage } from '../features/admin/catalog/AdminPaymentMethodsPage';
import { AdminProductCreatePage } from '../features/admin/catalog/AdminProductCreatePage';
import { AdminProductEditPage } from '../features/admin/catalog/AdminProductEditPage';
import { AdminProductsListPage } from '../features/admin/catalog/AdminProductsListPage';
import { AdminLayout } from '../features/admin/components/AdminLayout';
import { LoginPage } from '../features/auth/LoginPage';
import {
  AdminRoute,
  CustomerRoute,
  ProtectedRoute,
  PublicOnlyRoute,
} from '../features/auth/ProtectedRoute';
import { RegisterPage } from '../features/auth/RegisterPage';
import { AddressBookPage } from '../features/addresses/AddressBookPage';
import { CartPage } from '../features/cart/CartPage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ProductDetailPage } from '../features/catalog/ProductDetailPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { OrderDetailPage } from '../features/orders/OrderDetailPage';
import { OrdersListPage } from '../features/orders/OrdersListPage';
import { Layout } from '../shared/components/Layout';
import { ShellPage } from '../shared/components/ShellPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<Layout />}>
        <Route element={<CustomerRoute />}>
          <Route index element={<CatalogPage />} />
          <Route path="products/:slug" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="account" element={<ShellPage />} />
          <Route path="account/orders" element={<OrdersListPage />} />
          <Route path="account/orders/:orderNumber" element={<OrderDetailPage />} />
          <Route path="account/addresses" element={<AddressBookPage />} />
        </Route>
      </Route>

      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="admin" element={<AdminHubPage />} />
          <Route path="admin/orders" element={<AdminOrdersListPage />} />
          <Route path="admin/orders/:orderNumber" element={<AdminOrderDetailPage />} />
          <Route path="admin/categories" element={<AdminCategoriesPage />} />
          <Route path="admin/products" element={<AdminProductsListPage />} />
          <Route path="admin/products/new" element={<AdminProductCreatePage />} />
          <Route path="admin/products/:id/edit" element={<AdminProductEditPage />} />
          <Route path="admin/payment-methods" element={<AdminPaymentMethodsPage />} />
          <Route path="admin/inquiries" element={<AdminInquiriesPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
