import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/utils';
import testI18n from '../../test/testI18n';
import { QueryErrorState } from './QueryErrorState';
import * as Sentry from '@sentry/react';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

describe('QueryErrorState', () => {
  it('renders the message prop', () => {
    renderWithProviders(
      <QueryErrorState message="Something went wrong" retryLabel="Retry" onRetry={vi.fn()} />,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders retry button with localized label', () => {
    const label = testI18n.t('query.retry');
    renderWithProviders(
      <QueryErrorState message="Error" retryLabel={label} onRetry={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });

  it('calls onRetry when button is pressed', async () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <QueryErrorState message="Error" retryLabel="Retry" onRetry={onRetry} />,
    );

    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders in English locale with retry CTA', () => {
    void testI18n.changeLanguage('en');
    const label = testI18n.t('query.retry');

    renderWithProviders(
      <QueryErrorState message="Something went wrong" retryLabel={label} onRetry={vi.fn()} />,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders in Arabic locale with retry CTA', () => {
    void testI18n.changeLanguage('ar');
    const label = testI18n.t('query.retry');

    renderWithProviders(
      <QueryErrorState message="حدث خطأ" retryLabel={label} onRetry={vi.fn()} />,
    );

    expect(screen.getByText('حدث خطأ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });

  it('renders role="alert" for accessibility', () => {
    renderWithProviders(
      <QueryErrorState message="Error" retryLabel="Retry" onRetry={vi.fn()} />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('captures exception in Sentry when error is passed', () => {
    const error = new Error('Test API error');
    renderWithProviders(
      <QueryErrorState message="Error" retryLabel="Retry" onRetry={vi.fn()} error={error} />,
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });
});
