import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { AdminLayout } from '../features/admin/components/AdminLayout';
import {
  AdminRoute,
  CustomerRoute,
  ProtectedRoute,
  PublicOnlyRoute,
} from '../features/auth/ProtectedRoute';
import { Layout } from '../shared/components/Layout';
import { NotFoundPage } from '../shared/pages/NotFoundPage';
import { useAuth } from '../features/auth/useAuth';

// Auth guards are kept eager — they are tiny and must resolve synchronously.
// All page-level components are lazy so they only load when navigated to.

const LoginPage = lazy(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('../features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const AuthShell = lazy(() => import('../features/auth/components/AuthShell').then((m) => ({ default: m.AuthShell })));

const CatalogPage = lazy(() => import('../features/catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const ProductDetailPage = lazy(() => import('../features/catalog/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const CartPage = lazy(() => import('../features/cart/CartPage').then((m) => ({ default: m.CartPage })));
const InquiriesPage = lazy(() => import('../features/inquiries/InquiriesPage').then((m) => ({ default: m.InquiriesPage })));

const CheckoutPage = lazy(() => import('../features/checkout/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const ShellPage = lazy(() => import('../shared/components/ShellPage').then((m) => ({ default: m.ShellPage })));
const OrdersListPage = lazy(() => import('../features/orders/OrdersListPage').then((m) => ({ default: m.OrdersListPage })));
const OrderDetailPage = lazy(() => import('../features/orders/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })));
const AddressBookPage = lazy(() => import('../features/addresses/AddressBookPage').then((m) => ({ default: m.AddressBookPage })));

const AdminHubPage = lazy(() => import('../features/admin/AdminHubPage').then((m) => ({ default: m.AdminHubPage })));
const AdminOrdersListPage = lazy(() => import('../features/admin/AdminOrdersListPage').then((m) => ({ default: m.AdminOrdersListPage })));
const AdminOrderDetailPage = lazy(() => import('../features/admin/AdminOrderDetailPage').then((m) => ({ default: m.AdminOrderDetailPage })));
const AdminCategoriesPage = lazy(() => import('../features/admin/catalog/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })));
const AdminProductsListPage = lazy(() => import('../features/admin/catalog/AdminProductsListPage').then((m) => ({ default: m.AdminProductsListPage })));
const AdminProductCreatePage = lazy(() => import('../features/admin/catalog/AdminProductCreatePage').then((m) => ({ default: m.AdminProductCreatePage })));
const AdminProductEditPage = lazy(() => import('../features/admin/catalog/AdminProductEditPage').then((m) => ({ default: m.AdminProductEditPage })));
const AdminPaymentMethodsPage = lazy(() => import('../features/admin/catalog/AdminPaymentMethodsPage').then((m) => ({ default: m.AdminPaymentMethodsPage })));
const AdminShippingFeesPage = lazy(() => import('../features/admin/shipping/AdminShippingFeesPage').then((m) => ({ default: m.AdminShippingFeesPage })));
const AdminInquiriesPage = lazy(() => import('../features/admin/AdminInquiriesPage').then((m) => ({ default: m.AdminInquiriesPage })));
const AdminUsersPage = lazy(() => import('../features/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminAuditPage = lazy(() => import('../features/admin/audit/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const AdminShippingLabelPage = lazy(() => import('../features/admin/AdminShippingLabelPage').then((m) => ({ default: m.AdminShippingLabelPage })));
const AdminReturnsListPage = lazy(() => import('../features/admin/AdminReturnsListPage').then((m) => ({ default: m.AdminReturnsListPage })));
const AdminReturnDetailPage = lazy(() => import('../features/admin/AdminReturnDetailPage').then((m) => ({ default: m.AdminReturnDetailPage })));
const AdminWhatsAppStatusPage = lazy(() => import('../features/admin/AdminWhatsAppStatusPage').then((m) => ({ default: m.AdminWhatsAppStatusPage })));
const AdminWhatsAppQrPage = lazy(() => import('../features/admin/AdminWhatsAppQrPage').then((m) => ({ default: m.AdminWhatsAppQrPage })));
const ReturnsListPage = lazy(() => import('../features/orders/ReturnsListPage').then((m) => ({ default: m.ReturnsListPage })));
const AccountSecurityPage = lazy(() => import('../features/account/AccountSecurityPage').then((m) => ({ default: m.AccountSecurityPage })));
const AccountNotificationsPage = lazy(() => import('../features/account/AccountNotificationsPage').then((m) => ({ default: m.AccountNotificationsPage })));
const AccountProfilePage = lazy(() => import('../features/account/AccountProfilePage').then((m) => ({ default: m.AccountProfilePage })));

function PageFallback() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Spinner aria-label={t('loading.page')} />
    </div>
  );
}

export function AppRoutes() {
  const { isBootstrapping } = useAuth();

  if (isBootstrapping) return <SessionFallback />;

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthShell />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        <Route element={<AuthShell />}>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<Layout />}>
          <Route element={<CustomerRoute />}>
            <Route index element={<CatalogPage />} />
            <Route path="products/:slug" element={<ProductDetailPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="inquiries" element={<InquiriesPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="account" element={<ShellPage />} />
            <Route path="account/orders" element={<OrdersListPage />} />
            <Route path="account/profile" element={<AccountProfilePage />} />
            <Route path="account/orders/:orderNumber" element={<OrderDetailPage />} />
            <Route path="account/returns" element={<ReturnsListPage />} />
            <Route path="account/addresses" element={<AddressBookPage />} />
            <Route path="account/security" element={<AccountSecurityPage />} />
            <Route path="account/notifications" element={<AccountNotificationsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="admin/orders/:orderNumber/shipping-label" element={<AdminShippingLabelPage />} />
          <Route element={<AdminLayout />}>
            <Route path="admin" element={<AdminHubPage />} />
            <Route path="admin/orders" element={<AdminOrdersListPage />} />
            <Route path="admin/orders/:orderNumber" element={<AdminOrderDetailPage />} />
            <Route path="admin/returns" element={<AdminReturnsListPage />} />
            <Route path="admin/returns/:returnId" element={<AdminReturnDetailPage />} />
            <Route path="admin/categories" element={<AdminCategoriesPage />} />
            <Route path="admin/products" element={<AdminProductsListPage />} />
            <Route path="admin/products/new" element={<AdminProductCreatePage />} />
            <Route path="admin/products/:id/edit" element={<AdminProductEditPage />} />
            <Route path="admin/payment-methods" element={<AdminPaymentMethodsPage />} />
            <Route path="admin/shipping-fees" element={<AdminShippingFeesPage />} />
            <Route path="admin/inquiries" element={<AdminInquiriesPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/audit" element={<AdminAuditPage />} />
            <Route path="admin/whatsapp" element={<AdminWhatsAppStatusPage />} />
            <Route path="admin/whatsapp/pair" element={<AdminWhatsAppQrPage />} />
            <Route path="admin/*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

function SessionFallback() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Spinner aria-label={t('loading.session')} />
    </div>
  );
}
