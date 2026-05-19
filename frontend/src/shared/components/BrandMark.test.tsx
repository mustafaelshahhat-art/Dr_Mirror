import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { axe } from '../../test/axe';
import { BrandMark, type BrandMarkSize } from './BrandMark';

const CANONICAL_SIZES: BrandMarkSize[] = [16, 20, 24, 32, 40];

describe('BrandMark', () => {
  it('renders at default size 24', () => {
    const { container } = render(<BrandMark />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('24');
    expect(svg?.getAttribute('height')).toBe('24');
  });

  it.each(CANONICAL_SIZES)('renders size=%i with correct width/height attributes', (size) => {
    const { container } = render(<BrandMark size={size} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe(String(size));
    expect(svg?.getAttribute('height')).toBe(String(size));
  });

  it.each(CANONICAL_SIZES)('size=%i has no hidden paths', (size) => {
    const { container } = render(<BrandMark size={size} />);
    const hiddenPaths = Array.from(container.querySelectorAll('path')).filter(
      (p) => p.getAttribute('display') === 'none',
    );
    expect(hiddenPaths).toHaveLength(0);
  });

  it('renders <title> and role="img" when title prop is provided', () => {
    render(<BrandMark title="Dr Mirror" />);
    expect(screen.getByRole('img', { name: 'Dr Mirror' })).toBeInTheDocument();
    expect(screen.getByText('Dr Mirror').tagName.toLowerCase()).toBe('title');
  });

  it('sets aria-hidden="true" when no title is provided', () => {
    const { container } = render(<BrandMark />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('has no axe violations when decorative (aria-hidden)', async () => {
    const { container } = render(<BrandMark />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when titled (role=img)', async () => {
    const { container } = render(<BrandMark title="Dr Mirror" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
