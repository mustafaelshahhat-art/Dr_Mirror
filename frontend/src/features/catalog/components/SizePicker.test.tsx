import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SizePicker } from './SizePicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) =>
      opts?.size ? String(opts.size) : k,
    i18n: { language: 'en' },
  }),
}));

const sizes = ['S', 'M', 'L', 'XL'];
const makeVariants = (stockMap: Record<string, number>) =>
  Object.entries(stockMap).map(([size, stock]) => ({
    size,
    stock,
    id: size,
    colorName: 'Red',
    colorNameAr: 'أحمر',
    colorHex: '#ff0000',
    sku: `R-${size}`,
    isActive: true,
  }));

describe('SizePicker', () => {
  it('renders all sizes', () => {
    const variants = makeVariants({ S: 5, M: 5, L: 5, XL: 5 });
    render(<SizePicker sizes={sizes} variantsForColor={variants} selected={null} onSelect={vi.fn()} />);
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('disables out-of-stock sizes', () => {
    const variants = makeVariants({ S: 0, M: 5, L: 5, XL: 5 });
    render(<SizePicker sizes={sizes} variantsForColor={variants} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'S' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'M' })).not.toBeDisabled();
  });

  it('calls onSelect on click for in-stock size', async () => {
    const onSelect = vi.fn();
    const variants = makeVariants({ S: 5, M: 5, L: 5, XL: 5 });
    render(<SizePicker sizes={sizes} variantsForColor={variants} selected={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('radio', { name: 'L' }));
    expect(onSelect).toHaveBeenCalledWith('L');
  });

  it('moves to next available size on ArrowRight', () => {
    const onSelect = vi.fn();
    const variants = makeVariants({ S: 5, M: 5, L: 5, XL: 5 });
    render(<SizePicker sizes={sizes} variantsForColor={variants} selected="M" onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith('L');
  });

  it('skips disabled sizes when navigating with arrow keys', () => {
    const onSelect = vi.fn();
    // S=in-stock, M=out, L=in-stock
    const variants = makeVariants({ S: 5, M: 0, L: 5, XL: 0 });
    render(<SizePicker sizes={['S', 'M', 'L']} variantsForColor={variants} selected="S" onSelect={onSelect} />);
    // availableSizes = ['S', 'L'], current=0, next=1
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith('L');
  });

  it('gives tabIndex=0 to first available size when nothing selected', () => {
    const variants = makeVariants({ S: 0, M: 5, L: 5, XL: 5 });
    render(<SizePicker sizes={sizes} variantsForColor={variants} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'M' })).toHaveAttribute('tabindex', '0');
  });
});
