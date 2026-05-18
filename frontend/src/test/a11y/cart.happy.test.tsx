import { describe, expect, it, vi } from 'vitest';

import { CartContext, type CartContextValue } from '../../features/cart/CartContext';
import { CartPage } from '../../features/cart/CartPage';
import { renderWithProviders } from '../utils';
import { axe } from '../axe';

const cartContext: CartContextValue = {
  cart: {
    items: [{
      id: 'item-1', productId: 'p1', productSlug: 'scrub', nameAr: 'سكرب', nameEn: 'Scrub',
      productVariantId: 'v1', size: 'M', colorName: 'Navy', colorNameAr: 'كحلي', colorHex: '#000080',
      sku: 'SKU-1', quantity: 1, unitPrice: 100, unitPriceSnapshot: 100, lineTotal: 100,
      variantStock: 10, primaryImageUrl: null, isAvailable: true,
    }],
    subTotal: 100,
    totalQuantity: 1,
    isMutating: false,
    isLoading: false,
    error: null,
  },
  addItem: vi.fn(), updateQuantity: vi.fn(), removeItem: vi.fn(), clear: vi.fn(),
  mergeError: null, retryMerge: vi.fn(),
};

describe('a11y cart happy', () => {
  it('has no axe violations', async () => {
    const { container } = renderWithProviders(
      <CartContext.Provider value={cartContext}><CartPage /></CartContext.Provider>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
