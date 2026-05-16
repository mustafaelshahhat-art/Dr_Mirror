import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link } from 'react-router-dom';
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

    expect(screen.getByRole('alert')).toHaveTextContent('Access denied');
  });

  it('dismiss button clears the message', async () => {
    const user = userEvent.setup();
    setForbiddenMessage('Access denied');
    renderWithProviders(<ForbiddenBanner />);

    const dismiss = screen.getByRole('button', { name: /dismiss/i });
    await user.click(dismiss);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears a stale message after the next navigation', async () => {
    const user = userEvent.setup();
    setForbiddenMessage('Access denied');
    renderWithProviders(
      <>
        <ForbiddenBanner />
        <Link to="/next">Next page</Link>
      </>,
      { route: '/admin' },
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Access denied');

    await user.click(screen.getByRole('link', { name: 'Next page' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
