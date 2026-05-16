import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ColorPicker } from './ColorPicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en' },
  }),
}));

const colors = [
  { colorName: 'Red', colorNameAr: 'أحمر', colorHex: '#ff0000', id: '1', size: 'M', sku: 'R-M', stock: 5 } as never,
  { colorName: 'Blue', colorNameAr: 'أزرق', colorHex: '#0000ff', id: '2', size: 'M', sku: 'B-M', stock: 5 } as never,
  { colorName: 'Green', colorNameAr: 'أخضر', colorHex: '#00ff00', id: '3', size: 'M', sku: 'G-M', stock: 5 } as never,
];

describe('ColorPicker', () => {
  it('renders all color swatches', () => {
    render(<ColorPicker colors={colors} selected={null} onSelect={vi.fn()} />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('marks the selected swatch as checked', () => {
    render(<ColorPicker colors={colors} selected="Blue" onSelect={vi.fn()} />);
    const blueBtn = screen.getByRole('radio', { name: 'Blue' });
    expect(blueBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onSelect when a swatch is clicked', async () => {
    const onSelect = vi.fn();
    render(<ColorPicker colors={colors} selected={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Green' }));
    expect(onSelect).toHaveBeenCalledWith('Green');
  });

  it('moves to next color on ArrowRight key', () => {
    const onSelect = vi.fn();
    render(<ColorPicker colors={colors} selected="Red" onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith('Blue');
  });

  it('moves to previous color on ArrowLeft key', () => {
    const onSelect = vi.fn();
    render(<ColorPicker colors={colors} selected="Blue" onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenCalledWith('Red');
  });

  it('wraps from last to first on ArrowRight', () => {
    const onSelect = vi.fn();
    render(<ColorPicker colors={colors} selected="Green" onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith('Red');
  });

  it('gives tabIndex=0 to first swatch when nothing is selected', () => {
    render(<ColorPicker colors={colors} selected={null} onSelect={vi.fn()} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveAttribute('tabindex', '0');
    expect(radios[1]).toHaveAttribute('tabindex', '-1');
  });

  it('gives tabIndex=0 only to the selected swatch', () => {
    render(<ColorPicker colors={colors} selected="Blue" onSelect={vi.fn()} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveAttribute('tabindex', '-1');
    expect(radios[1]).toHaveAttribute('tabindex', '0');
    expect(radios[2]).toHaveAttribute('tabindex', '-1');
  });
});
