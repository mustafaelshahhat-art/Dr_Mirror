import { describe, expect, it, vi } from 'vitest';

import { CartContext, type CartContextValue } from '../../features/cart/CartContext';
import { CartPage } from '../../features/cart/CartPage';
import { renderWithProviders } from '../utils';
import { axe } from '../axe';

const cartContext: CartContextValue = {
  cart: { items: [], subTotal: 0, totalQuantity: 0, isMutating: false, isLoading: false, error: null },
  addItem: vi.fn(), updateQuantity: vi.fn(), removeItem: vi.fn(), clear: vi.fn(),
  mergeError: null, retryMerge: vi.fn(),
};

describe('a11y cart empty', () => {
  it('has no axe violations', async () => {
    const { container } = renderWithProviders(
      <CartContext.Provider value={cartContext}><CartPage /></CartContext.Provider>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
