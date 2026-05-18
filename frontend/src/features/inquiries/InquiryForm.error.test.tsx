import { describe, expect, it } from 'vitest';

import hooks from './hooks.ts?raw';
import form from './components/InquiryForm.tsx?raw';

describe('inquiry mutation error wiring', () => {
  it('routes buyer and admin inquiry failures through the shared toast helper', () => {
    expect(hooks).toContain('useApiErrorToast');
    expect(hooks.match(/onError: errorToast/g)).toHaveLength(3);
    expect(form).not.toContain('response?.data');
    expect(form).not.toContain('ProblemDetails');
  });
});
