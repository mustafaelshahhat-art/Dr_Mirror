import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import { PAYMENT_METHOD_KIND, type PaymentMethodDto } from '../../orders/types';
import { PaymentMethodPicker } from './PaymentMethodPicker';

const methods: PaymentMethodDto[] = [
  {
    id: 'pm-cod',
    code: 'cod',
    kind: PAYMENT_METHOD_KIND.Cod,
    nameAr: 'الدفع عند الاستلام',
    nameEn: 'Cash on Delivery',
    instructionsAr: null,
    instructionsEn: 'Pay the courier when your order arrives.',
    accountNumber: null,
    accountHolder: null,
    displayOrder: 1,
  },
  {
    id: 'pm-instapay',
    code: 'instapay',
    kind: PAYMENT_METHOD_KIND.Instapay,
    nameAr: 'إنستاباي',
    nameEn: 'Instapay',
    instructionsAr: null,
    instructionsEn: 'Upload proof after transfer.',
    accountNumber: '01000000000',
    accountHolder: 'Dr.Mirror',
    displayOrder: 2,
  },
];

describe('PaymentMethodPicker', () => {
  it('selects a payment method through HeroUI radio semantics', async () => {
    const onSelect = vi.fn();

    renderWithProviders(
      <PaymentMethodPicker methods={methods} selectedId="pm-cod" onSelect={onSelect} />,
    );

    expect(screen.getByRole('radio', { name: /cash on delivery/i })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: /instapay/i }));

    expect(onSelect).toHaveBeenCalledWith('pm-instapay');
  });

  it('keeps keyboard selection on the HeroUI radio group', () => {
    const onSelect = vi.fn();

    renderWithProviders(
      <PaymentMethodPicker methods={methods} selectedId="pm-cod" onSelect={onSelect} />,
    );

    const cod = screen.getByRole('radio', { name: /cash on delivery/i });
    cod.focus();
    fireEvent.keyDown(cod, { key: 'ArrowDown' });

    expect(onSelect).toHaveBeenCalledWith('pm-instapay');
  });
});
