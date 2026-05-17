import { screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { renderWithProviders } from '../../test/utils';
import type { CartContextValue, CartView } from './CartContext';
import { CartContext } from './CartContext';
import { CartPage } from './CartPage';
import type { CartItemDto } from './types';

const emptyCart: CartView = {
  items: [],
  subTotal: 0,
  totalQuantity: 0,
  isMutating: false,
  isLoading: false,
  error: null,
};

const sampleItem: CartItemDto = {
  id: 'item-1',
  productId: 'prod-1',
  productSlug: 'test-product',
  nameAr: 'منتج اختبار',
  nameEn: 'Test Product',
  productVariantId: 'variant-1',
  size: 'M',
  colorName: 'Blue',
  colorNameAr: 'أزرق',
  colorHex: '#0000FF',
  sku: 'SKU-1',
  quantity: 2,
  unitPrice: 100,
  unitPriceSnapshot: 100,
  lineTotal: 200,
  variantStock: 10,
  primaryImageUrl: null,
  isAvailable: true,
};

function makeCartContextValue(overrides: Partial<CartView> = {}): CartContextValue {
  const cart: CartView = { ...emptyCart, ...overrides };
  return {
    cart,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    mergeError: null,
    retryMerge: vi.fn(),
  };
}

describe('CartPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows empty state when cart has no items', () => {
    const ctx = makeCartContextValue();
    renderWithProviders(
      <CartContext.Provider value={ctx}><CartPage /></CartContext.Provider>,
    );
    expect(screen.getByRole('heading', { name: /your cart is empty/i })).toBeInTheDocument();
  });

  it('shows cart items when cart has items', () => {
    const ctx = makeCartContextValue({ items: [sampleItem], subTotal: 200, totalQuantity: 2 });
    renderWithProviders(
      <CartContext.Provider value={ctx}><CartPage /></CartContext.Provider>,
    );
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('announces server errors with role=alert', () => {
    const ctx = makeCartContextValue({ error: new Error('Server error') });
    renderWithProviders(
      <CartContext.Provider value={ctx}><CartPage /></CartContext.Provider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Server error');
  });

  it('shows loading state', () => {
    const ctx = makeCartContextValue({ isLoading: true });
    renderWithProviders(
      <CartContext.Provider value={ctx}><CartPage /></CartContext.Provider>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows merge error with retry button', () => {
    const retry = vi.fn();
    const ctx: CartContextValue = {
      cart: emptyCart,
      addItem: vi.fn(),
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      mergeError: 'Merge failed',
      retryMerge: retry,
    };
    renderWithProviders(
      <CartContext.Provider value={ctx}><CartPage /></CartContext.Provider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Merge failed');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
