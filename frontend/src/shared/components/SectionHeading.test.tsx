import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { axe } from '../../test/axe';
import { SectionHeading } from './SectionHeading';

describe('SectionHeading', () => {
  it('renders the title text', () => {
    render(<SectionHeading title="Recent Orders" />);
    expect(screen.getByText('Recent Orders')).toBeInTheDocument();
  });

  it('renders as h2 by default', () => {
    render(<SectionHeading title="Recent Orders" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Recent Orders' })).toBeInTheDocument();
  });

  it('renders as h3 when as="h3"', () => {
    render(<SectionHeading title="Sub Section" as="h3" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Sub Section' })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<SectionHeading title="Orders" description="Last 30 days" />);
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('renders action slot when provided', () => {
    render(<SectionHeading title="Orders" action={<button>View all</button>} />);
    expect(screen.getByRole('button', { name: 'View all' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <SectionHeading title="Recent Orders" description="Last 30 days" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
