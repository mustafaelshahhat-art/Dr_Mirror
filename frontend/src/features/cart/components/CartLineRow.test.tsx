import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../test/utils';
import { CartLineRow } from './CartLineRow';
import type { CartItemDto } from '../types';
import { MAX_QUANTITY_PER_LINE } from '../types';

const baseLine: CartItemDto = {
  id: 'item-1',
  productId: 'prod-1',
  productSlug: 'test-scrub',
  nameAr: 'سكراب اختبار',
  nameEn: 'Test Scrub',
  productVariantId: 'v-1',
  size: 'M',
  colorName: 'Navy',
  colorNameAr: 'كحلي',
  colorHex: '#001f5b',
  sku: 'SKU-NAVY-M',
  quantity: 2,
  unitPrice: 150,
  unitPriceSnapshot: 150,
  lineTotal: 300,
  variantStock: 10,
  primaryImageUrl: null,
  isAvailable: true,
};

function setup(overrides: Partial<CartItemDto> = {}) {
  const line = { ...baseLine, ...overrides };
  const onUpdate = vi.fn();
  const onRemove = vi.fn();
  renderWithProviders(
    <CartLineRow
      line={line}
      onUpdate={onUpdate}
      onRemove={onRemove}
      isMutating={false}
    />,
  );
  return { onUpdate, onRemove };
}

describe('CartLineRow', () => {
  it('renders product name and line total', () => {
    setup();
    expect(screen.getByText('Test Scrub')).toBeInTheDocument();
    expect(screen.getByText(/300/)).toBeInTheDocument();
  });

  it('calls onUpdate with decremented quantity on − press', async () => {
    const { onUpdate } = setup();
    const decreaseBtn = screen.getByRole('button', { name: /decrease quantity/i });
    await userEvent.click(decreaseBtn);
    expect(onUpdate).toHaveBeenCalledWith(1);
  });

  it('calls onUpdate with incremented quantity on + press', async () => {
    const { onUpdate } = setup();
    const increaseBtn = screen.getByRole('button', { name: /increase quantity/i });
    await userEvent.click(increaseBtn);
    expect(onUpdate).toHaveBeenCalledWith(3);
  });

  it('disables decrease button when quantity is 1', () => {
    setup({ quantity: 1 });
    const decreaseBtn = screen.getByRole('button', { name: /decrease quantity/i });
    expect(decreaseBtn).toBeDisabled();
  });

  it('disables increase button when at MAX_QUANTITY_PER_LINE', () => {
    setup({ quantity: MAX_QUANTITY_PER_LINE });
    const increaseBtn = screen.getByRole('button', { name: /increase quantity/i });
    expect(increaseBtn).toBeDisabled();
  });

  it('disables increase button when at variant stock limit', () => {
    setup({ quantity: 5, variantStock: 5 });
    const increaseBtn = screen.getByRole('button', { name: /increase quantity/i });
    expect(increaseBtn).toBeDisabled();
  });

  it('calls onRemove when remove button is pressed', async () => {
    const { onRemove } = setup();
    await userEvent.click(screen.getByRole('button', { name: /remove item/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('all mutation buttons are disabled when isMutating=true', () => {
    const line = { ...baseLine };
    renderWithProviders(
      <CartLineRow line={line} onUpdate={vi.fn()} onRemove={vi.fn()} isMutating={true} />,
    );
    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /increase quantity/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove item/i })).toBeDisabled();
  });

  it('shows unavailable warning when item is not available', () => {
    setup({ isAvailable: false });
    expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
  });
});
