import { describe, expect, it } from 'vitest';

import hooks from './hooks.ts?raw';
import form from './components/AddressForm.tsx?raw';

describe('address mutation error wiring', () => {
  it('routes address CRUD failures through the shared toast helper', () => {
    expect(hooks).toContain('useApiErrorToast');
    expect(hooks.match(/onError: errorToast/g)).toHaveLength(4);
    expect(form).not.toContain('response?.data');
    expect(form).not.toContain('ProblemDetails');
  });
});
