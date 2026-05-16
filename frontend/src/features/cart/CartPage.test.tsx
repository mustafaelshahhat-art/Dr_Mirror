import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/utils';
import { CartPage } from './CartPage';
import { useCart } from './useCart';

vi.mock('./useCart', () => ({
  useCart: vi.fn(),
}));

describe('CartPage', () => {
  it('announces server cart errors as alerts', () => {
    vi.mocked(useCart).mockReturnValue({
      cart: {
        items: [],
        subTotal: 0,
        totalQuantity: 0,
        isMutating: false,
        isLoading: false,
        error: new Error('Cart could not be loaded.'),
      },
      addItem: vi.fn(),
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      mergeError: null,
      retryMerge: vi.fn(),
    });

    renderWithProviders(<CartPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Cart could not be loaded.');
  });
});
