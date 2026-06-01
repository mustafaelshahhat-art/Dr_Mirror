import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import type { BuyerAddressDto } from '../../addresses/types';
import type { CheckoutForm } from '../schemas';
import { AddressStep } from './AddressStep';

const savedAddresses: BuyerAddressDto[] = [
  {
    id: 'addr-home',
    label: 'Home',
    recipientName: 'Buyer User',
    phone: '01000000000',
    governorate: 'cairo',
    city: 'Maadi',
    streetAddress: '12 Clinic Street',
    floor: null,
    apartment: null,
    landmark: null,
    notes: null,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'addr-work',
    label: 'Work',
    recipientName: 'Buyer User',
    phone: '01111111111',
    governorate: 'giza',
    city: 'Dokki',
    streetAddress: '7 Hospital Road',
    floor: null,
    apartment: null,
    landmark: null,
    notes: null,
    isDefault: false,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
];

function AddressStepHarness({
  onSavedChange = vi.fn(),
  isLoading = false,
  isError = false,
  onRetry,
  addresses = savedAddresses,
  initialSavedId = 'addr-home',
}: {
  onSavedChange?: (id: string | null) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  addresses?: BuyerAddressDto[];
  initialSavedId?: string | null;
}) {
  const form = useForm<CheckoutForm>({
    defaultValues: {
      address: {
        recipientName: '',
        phone: '',
        governorate: '',
        city: '',
        streetAddress: '',
        floor: '',
        apartment: '',
        landmark: '',
        notes: '',
      },
      buyerAddressId: initialSavedId,
      paymentMethodId: '',
      saveAsNewAddress: false,
      label: '',
      buyerNote: '',
    },
  });
  const [savedAddressId, setSavedAddressId] = useState<string | null>(initialSavedId);
  const [saveAsNewAddress, setSaveAsNewAddress] = useState(false);

  function handleSavedChange(id: string | null) {
    setSavedAddressId(id);
    onSavedChange(id);
  }

  return (
    <AddressStep
      control={form.control}
      watch={form.watch}
      setValue={form.setValue}
      savedAddresses={addresses}
      savedAddressId={savedAddressId}
      setSavedAddressId={handleSavedChange}
      saveAsNewAddress={saveAsNewAddress}
      setSaveAsNewAddress={setSaveAsNewAddress}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
    />
  );
}

describe('AddressStep saved address radios', () => {
  it('selects saved addresses and the new-address option through HeroUI radio semantics', async () => {
    const onSavedChange = vi.fn();

    renderWithProviders(<AddressStepHarness onSavedChange={onSavedChange} />);

    expect(screen.getByRole('radio', { name: /home/i })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: /work/i }));
    expect(onSavedChange).toHaveBeenCalledWith('addr-work');

    await userEvent.click(screen.getByRole('radio', { name: /use a new address/i }));
    expect(onSavedChange).toHaveBeenCalledWith(null);
    expect(screen.getByLabelText(/recipient name/i)).toBeInTheDocument();
  });

  it('keeps keyboard selection on the HeroUI radio group', () => {
    const onSavedChange = vi.fn();

    renderWithProviders(<AddressStepHarness onSavedChange={onSavedChange} />);

    const home = screen.getByRole('radio', { name: /home/i });
    home.focus();
    fireEvent.keyDown(home, { key: 'ArrowDown' });

    expect(onSavedChange).toHaveBeenCalledWith('addr-work');
  });
});

describe('AddressStep query states', () => {
  it('shows a loading placeholder and no new-address form while addresses load', () => {
    renderWithProviders(<AddressStepHarness isLoading initialSavedId={null} />);

    // Loading placeholder is announced; neither saved radios nor the inline
    // new-address form should appear yet (this is the anti-flicker guarantee).
    expect(screen.getByLabelText(/loading your saved addresses/i)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/recipient name/i)).not.toBeInTheDocument();
  });

  it('shows an error state with retry instead of the new-address form on failure', async () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <AddressStepHarness isError onRetry={onRetry} initialSavedId={null} />,
    );

    expect(screen.getByText(/couldn't load your saved addresses/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/recipient name/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the new-address form once loading settles with zero saved addresses', () => {
    renderWithProviders(
      <AddressStepHarness addresses={[]} initialSavedId={null} />,
    );

    expect(screen.queryByLabelText(/loading your saved addresses/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/recipient name/i)).toBeInTheDocument();
  });
});
