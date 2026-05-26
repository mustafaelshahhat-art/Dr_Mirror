import { describe, expect, it } from 'vitest';

import hooks from './hooks.ts?raw';
import cancelButton from './components/CancelOrderButton.tsx?raw';

describe('order mutation error wiring', () => {
  it('routes order mutation failures through the shared toast helper', () => {
    expect(hooks).toContain('useApiErrorToast');
    expect(hooks.match(/onError: errorToast/g)).toHaveLength(4);
    expect(cancelButton).not.toContain('response?.data');
    expect(cancelButton).not.toContain('ProblemDetails');
  });
});
