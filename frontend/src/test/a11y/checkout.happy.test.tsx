import { describe, expect, it, vi } from 'vitest';

import { CartContext, type CartContextValue } from '../../features/cart/CartContext';
import { CheckoutPage } from '../../features/checkout/CheckoutPage';
import { makeAuthValue, makeBuyerUser, renderWithProviders } from '../utils';
import { axe } from '../axe';

vi.mock('../../features/orders/api', () => ({ ordersApi: {
  getPaymentMethods: vi.fn().mockResolvedValue([{ id: 'pm-cod', code: 'cod', kind: 'Cod', nameEn: 'Cash on Delivery', nameAr: 'الدفع عند الاستلام', displayOrder: 0 }]),
  createOrder: vi.fn(), listMyOrders: vi.fn(), getMyOrder: vi.fn(), cancelMyOrder: vi.fn(), uploadPaymentProof: vi.fn(), getAppConfig: vi.fn(),
} }));
vi.mock('../../features/addresses/hooks', () => ({ useAddressesQuery: () => ({ data: [], isLoading: false, isError: false }) }));

const cartContext: CartContextValue = {
  cart: { items: [{ id: 'i1', productId: 'p1', productSlug: 'scrub', nameAr: 'سكرب', nameEn: 'Scrub', productVariantId: 'v1', size: 'M', colorName: 'Navy', colorNameAr: 'كحلي', colorHex: '#000080', sku: 'SKU-1', quantity: 1, unitPrice: 100, unitPriceSnapshot: 100, lineTotal: 100, variantStock: 5, primaryImageUrl: null, isAvailable: true }], subTotal: 100, totalQuantity: 1, isMutating: false, isLoading: false, error: null },
  addItem: vi.fn(), updateQuantity: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), mergeError: null, retryMerge: vi.fn(),
};

describe('a11y checkout happy', () => {
  it('has no axe violations', async () => {
    const { container } = renderWithProviders(
      <CartContext.Provider value={cartContext}><CheckoutPage /></CartContext.Provider>,
      { authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true }) },
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
