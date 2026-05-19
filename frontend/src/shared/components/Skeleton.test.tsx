import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { axe } from '../../test/axe';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders a div with the shimmer class by default', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.classList.contains('skeleton-shimmer')).toBe(true);
  });

  it('does not apply the shimmer class when static={true}', () => {
    const { container } = render(<Skeleton static />);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains('skeleton-shimmer')).toBe(false);
  });

  it('always applies skeleton-base class', () => {
    const { container } = render(<Skeleton static />);
    expect((container.firstChild as HTMLElement).classList.contains('skeleton-base')).toBe(true);
  });

  it('applies className prop alongside base classes', () => {
    const { container } = render(<Skeleton className="h-4 w-full" />);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains('h-4')).toBe(true);
    expect(el.classList.contains('w-full')).toBe(true);
  });

  it('applies radius classes correctly', () => {
    const { container: c1 } = render(<Skeleton radius="full" />);
    expect((c1.firstChild as HTMLElement).classList.contains('rounded-full')).toBe(true);

    const { container: c2 } = render(<Skeleton radius="lg" />);
    expect((c2.firstChild as HTMLElement).classList.contains('rounded-lg')).toBe(true);
  });

  it('sets width/height inline styles when provided as CSS values', () => {
    const { container } = render(<Skeleton width="200px" height="48px" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('48px');
  });

  it('has no axe violations (static mode)', async () => {
    const { container } = render(<Skeleton static className="h-4 w-48" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
