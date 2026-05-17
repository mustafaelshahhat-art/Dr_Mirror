import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAuthValue, makeBuyerUser, renderWithProviders } from '../../test/utils';
import { CartContext } from '../cart/CartContext';
import type { CartContextValue, CartView } from '../cart/CartContext';
import { CheckoutPage } from './CheckoutPage';

vi.mock('../orders/api', () => ({
  ordersApi: {
    getPaymentMethods: vi.fn().mockResolvedValue([
      { id: 'pm-cod', code: 'cod', kind: 0, nameEn: 'Cash on Delivery', nameAr: 'الدفع عند الاستلام', displayOrder: 0 },
      { id: 'pm-instapay', code: 'instapay', kind: 1, nameEn: 'Instapay', nameAr: 'إنستاباي', displayOrder: 1 },
    ]),
    createOrder: vi.fn(),
    listMyOrders: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 }),
    getMyOrder: vi.fn(),
    cancelMyOrder: vi.fn(),
    uploadPaymentProof: vi.fn(),
  },
}));

vi.mock('../cart/api', () => ({
  cartApi: {
    get: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    merge: vi.fn().mockResolvedValue({ items: [], subTotal: 0, totalQuantity: 0 }),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('../addresses/hooks', () => ({
  useAddressesQuery: () => ({ data: [], isLoading: false, isError: false }),
}));

const cartWithItems: CartView = {
  items: [
    {
      id: 'item-1', productId: 'p1', productSlug: 'test', nameAr: 'منتج', nameEn: 'Test Product',
      productVariantId: 'v1', size: 'M', colorName: 'Blue', colorNameAr: 'أزرق', colorHex: '#00F',
      sku: 'SKU-1', quantity: 1, unitPrice: 100, unitPriceSnapshot: 100, lineTotal: 100,
      variantStock: 10, primaryImageUrl: null, isAvailable: true,
    },
  ],
  subTotal: 100,
  totalQuantity: 1,
  isMutating: false,
  isLoading: false,
  error: null,
};

const cartCtx: CartContextValue = {
  cart: cartWithItems,
  addItem: vi.fn(),
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  mergeError: null,
  retryMerge: vi.fn(),
};

describe('CheckoutPage', () => {
  it('shows empty-cart state when cart is empty and loaded', () => {
    const emptyCtx: CartContextValue = {
      ...cartCtx,
      cart: { ...cartCtx.cart, items: [], subTotal: 0, totalQuantity: 0 },
    };
    renderWithProviders(
      <CartContext.Provider value={emptyCtx}><CheckoutPage /></CartContext.Provider>,
      { authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true }) },
    );
    expect(screen.getByRole('heading', { name: /your cart is empty/i })).toBeInTheDocument();
  });

  it('shows loading spinner while cart is loading', () => {
    const loadingCtx: CartContextValue = {
      ...cartCtx,
      cart: { ...cartCtx.cart, isLoading: true },
    };
    renderWithProviders(
      <CartContext.Provider value={loadingCtx}><CheckoutPage /></CartContext.Provider>,
      { authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true }) },
    );
    expect(screen.getByLabelText('Loading checkout...')).toBeInTheDocument();
  });

  it('shows address step heading when cart has items', () => {
    renderWithProviders(
      <CartContext.Provider value={cartCtx}><CheckoutPage /></CartContext.Provider>,
      { authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true }) },
    );
    expect(screen.getByRole('group', { name: /shipping address/i })).toBeInTheDocument();
  });
});
