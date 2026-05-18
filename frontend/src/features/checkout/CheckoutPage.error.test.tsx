import { describe, expect, it } from 'vitest';

import page from './CheckoutPage.tsx?raw';
import orderHooks from '../orders/hooks.ts?raw';

describe('checkout mutation error wiring', () => {
  it('routes create-order failures through the shared toast helper', () => {
    expect(orderHooks).toContain('useApiErrorToast');
    expect(orderHooks).toContain('onError: errorToast');
    expect(page).not.toContain('response?.data');
    expect(page).not.toContain('ProblemDetails');
  });
});
