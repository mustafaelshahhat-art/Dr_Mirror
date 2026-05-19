import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { axe } from '../../test/axe';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the title text', () => {
    render(<PageHeader title="Products" />);
    expect(screen.getByText('Products')).toBeInTheDocument();
  });

  it('renders as h1 by default', () => {
    render(<PageHeader title="My Page" />);
    expect(screen.getByRole('heading', { level: 1, name: 'My Page' })).toBeInTheDocument();
  });

  it('renders as h2 when as="h2"', () => {
    render(<PageHeader title="Section" as="h2" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Section' })).toBeInTheDocument();
  });

  it('renders eyebrow text when provided', () => {
    render(<PageHeader eyebrow="Category" title="Products" />);
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Products" subtitle="Browse our catalog" />);
    expect(screen.getByText('Browse our catalog')).toBeInTheDocument();
  });

  it('renders action slot when provided', () => {
    render(<PageHeader title="Products" action={<button>Add Product</button>} />);
    expect(screen.getByRole('button', { name: 'Add Product' })).toBeInTheDocument();
  });

  it('applies center alignment class when align="center"', () => {
    const { container } = render(<PageHeader title="Centered" align="center" />);
    expect(container.firstChild).toHaveClass('items-center');
    expect(container.firstChild).toHaveClass('text-center');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <PageHeader eyebrow="Category" title="Products" subtitle="Browse all items" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
