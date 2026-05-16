import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';

import { renderWithProviders } from '../../test/utils';
import { setForbiddenMessage } from '../../shared/lib/forbidden-store';
import { ForbiddenBanner } from './ForbiddenBanner';

describe('ForbiddenBanner', () => {
  beforeEach(() => {
    setForbiddenMessage(null);
  });

  it('renders nothing when no message is set', () => {
    renderWithProviders(<ForbiddenBanner />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders an alert when message is set', () => {
    setForbiddenMessage('Access denied');
    renderWithProviders(<ForbiddenBanner />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('dismiss button clears the message', async () => {
    const user = userEvent.setup();
    setForbiddenMessage('Access denied');
    renderWithProviders(<ForbiddenBanner />);

    const dismiss = screen.getByRole('button', { name: /dismiss/i });
    await user.click(dismiss);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
