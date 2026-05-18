import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/utils';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and default Inbox icon', () => {
    renderWithProviders(<EmptyState title="No items found" />);

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    renderWithProviders(
      <EmptyState title="Cart is empty" subtitle="Add some products to get started" />,
    );

    expect(screen.getByText('Cart is empty')).toBeInTheDocument();
    expect(screen.getByText('Add some products to get started')).toBeInTheDocument();
  });

  it('renders action button and fires onPress', async () => {
    const onPress = vi.fn();
    renderWithProviders(
      <EmptyState title="No data" action={{ label: 'Browse catalog', onPress }} />,
    );

    const btn = screen.getByRole('button', { name: 'Browse catalog' });
    expect(btn).toBeInTheDocument();

    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.setup().click(btn);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
