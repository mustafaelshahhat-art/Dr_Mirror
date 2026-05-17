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

function AddressStepHarness({ onSavedChange = vi.fn() }: { onSavedChange?: (id: string | null) => void }) {
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
      paymentMethodId: '',
      buyerNote: '',
    },
  });
  const [savedAddressId, setSavedAddressId] = useState<string | null>('addr-home');
  const [saveAsNewAddress, setSaveAsNewAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');

  function handleSavedChange(id: string | null) {
    setSavedAddressId(id);
    onSavedChange(id);
  }

  return (
    <AddressStep
      control={form.control}
      watch={form.watch}
      setValue={form.setValue}
      savedAddresses={savedAddresses}
      savedAddressId={savedAddressId}
      setSavedAddressId={handleSavedChange}
      saveAsNewAddress={saveAsNewAddress}
      setSaveAsNewAddress={setSaveAsNewAddress}
      newAddressLabel={newAddressLabel}
      setNewAddressLabel={setNewAddressLabel}
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
