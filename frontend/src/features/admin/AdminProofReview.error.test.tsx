import { describe, expect, it } from 'vitest';

import orderHooks from './hooks.ts?raw';
import userHooks from './users/hooks.ts?raw';
import catalogHooks from './catalog/hooks.ts?raw';
import proofReview from './components/AdminProofReview.tsx?raw';
import transitions from './components/AdminTransitionActions.tsx?raw';

describe('admin mutation error wiring', () => {
  it('routes proof review, transitions, users, and catalog failures through the shared toast helper', () => {
    expect(orderHooks.match(/onError: errorToast/g)).toHaveLength(3);
    expect(userHooks).toContain('onError: errorToast');
    expect(catalogHooks.match(/onError: errorToast/g)).toHaveLength(15);
    expect(proofReview).not.toContain('response?.data');
    expect(transitions).not.toContain('response?.data');
  });
});
