import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAdminUser, makeAuthValue, renderWithProviders } from '../../../../test/utils';
import testI18n from '../../../../test/testI18n';
import { AdminProductCreatePage } from '../AdminProductCreatePage';
import { useAdminCategoriesQuery, useCreateProductMutation } from '../hooks';

vi.mock('../hooks', () => ({
  useAdminCategoriesQuery: vi.fn(),
  useCreateProductMutation: vi.fn(),
}));

const adminAuth = makeAuthValue({
  user: makeAdminUser(),
  isAuthenticated: true,
  isAdmin: true,
});

beforeEach(async () => {
  await testI18n.changeLanguage('en');
  vi.mocked(useAdminCategoriesQuery).mockReturnValue({
    isLoading: false,
    data: [{
      id: '11111111-1111-1111-1111-111111111111',
      nameAr: 'سكراب',
      nameEn: 'Scrubs',
      slug: 'scrubs',
      isActive: true,
      displayOrder: 1,
      productCount: 0,
    }],
  } as never);
  vi.mocked(useCreateProductMutation).mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  } as never);
});

describe('AdminProductCreatePage', () => {
  it('renders all product create fields', () => {
    renderWithProviders(<AdminProductCreatePage />, { authValue: adminAuth });

    expect(screen.getByLabelText('Arabic name')).toBeInTheDocument();
    expect(screen.getByLabelText('English name')).toBeInTheDocument();
    expect(screen.getByLabelText('Arabic description')).toBeInTheDocument();
    expect(screen.getByLabelText('English description')).toBeInTheDocument();
    expect(screen.getByLabelText('Price (EGP)')).toBeInTheDocument();
    expect(screen.getByLabelText('Gender')).toBeInTheDocument();
    expect(screen.getByLabelText('Material / fabric')).toBeInTheDocument();
    expect(screen.getByLabelText('Master SKU')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
  });

  it('shows Zod validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminProductCreatePage />, { authValue: adminAuth });

    await user.clear(screen.getByLabelText('Price (EGP)'));
    await user.click(screen.getByRole('button', { name: 'Create draft' }));

    expect(await screen.findByText('Arabic name is required.')).toBeInTheDocument();
    expect(screen.getByText('English name is required.')).toBeInTheDocument();
    expect(screen.getByText('Price must be greater than zero.')).toBeInTheDocument();
    expect(screen.getByText('Pick a category.')).toBeInTheDocument();
  });

  it('disables the submit button while creation is pending', () => {
    vi.mocked(useCreateProductMutation).mockReturnValue({
      isPending: true,
      mutateAsync: vi.fn(),
    } as never);

    renderWithProviders(<AdminProductCreatePage />, { authValue: adminAuth });

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
  });
});
