import { screen } from '@testing-library/react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { CartContext, type CartContextValue } from '../../features/cart/CartContext';
import { CheckoutPage } from '../../features/checkout/CheckoutPage';
import { FormField } from '../../features/auth/components/FormField';
import { useApiErrorToast } from '../../shared/hooks/useApiErrorToast';
import { makeAuthValue, makeBuyerUser, renderWithProviders } from '../utils';
import { axe } from '../axe';

vi.mock('../../features/orders/api', () => ({ ordersApi: {
  getPaymentMethods: vi.fn().mockResolvedValue([]), createOrder: vi.fn(), listMyOrders: vi.fn(), getMyOrder: vi.fn(), cancelMyOrder: vi.fn(), uploadPaymentProof: vi.fn(), getAppConfig: vi.fn(),
} }));
vi.mock('../../features/addresses/hooks', () => ({ useAddressesQuery: () => ({ data: [], isLoading: false, isError: false }) }));

const cartContext: CartContextValue = {
  cart: { items: [{ id: 'i1', productId: 'p1', productSlug: 'scrub', nameAr: 'سكرب', nameEn: 'Scrub', productVariantId: 'v1', size: 'M', colorName: 'Navy', colorNameAr: 'كحلي', colorHex: '#000080', sku: 'SKU-1', quantity: 1, unitPrice: 100, unitPriceSnapshot: 100, lineTotal: 100, variantStock: 5, primaryImageUrl: null, isAvailable: true }], subTotal: 100, totalQuantity: 1, isMutating: false, isLoading: false, error: new Error('Request failed') },
  addItem: vi.fn(), updateQuantity: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), mergeError: null, retryMerge: vi.fn(),
};

function ErrorToastProbe() {
  const showApiError = useApiErrorToast();

  useEffect(() => {
    showApiError(new Error('Request failed'));
  }, [showApiError]);

  return null;
}

type ValidationProbeForm = { phone: string };

function ValidationErrorProbe() {
  const { control, setError } = useForm<ValidationProbeForm>({ defaultValues: { phone: '' } });

  useEffect(() => {
    setError('phone', { message: 'checkout.errors.phoneRequired' });
  }, [setError]);

  return (
    <FormField
      name="phone"
      control={control}
      label="Phone"
      autoComplete="tel"
    />
  );
}

describe('a11y checkout error', () => {
  it('has no axe violations with visible validation and toast errors', async () => {
    const { container } = renderWithProviders(
      <CartContext.Provider value={cartContext}>
        <ErrorToastProbe />
        <ValidationErrorProbe />
        <CheckoutPage />
      </CartContext.Provider>,
      { authValue: makeAuthValue({ user: makeBuyerUser(), isAuthenticated: true }) },
    );

    await screen.findByText('Something went wrong. Please try again.');
    await screen.findByText(/Phone number/i);

    expect(await axe(container)).toHaveNoViolations();
  });
});
