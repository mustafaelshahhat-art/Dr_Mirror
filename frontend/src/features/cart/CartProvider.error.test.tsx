import { describe, expect, it } from 'vitest';

import provider from './CartProvider.tsx?raw';
import mergeHook from './hooks/useCartMerge.ts?raw';

describe('cart mutation error wiring', () => {
  it('routes cart mutation failures through the shared toast helper', () => {
    expect(provider).toContain('useApiErrorToast');
    expect(provider.match(/onError: errorToast/g)).toHaveLength(4);
    expect(mergeHook).toContain('onError: errorToast');
    expect(provider).not.toContain('response?.data');
    expect(mergeHook).not.toContain('response?.data');
  });
});
