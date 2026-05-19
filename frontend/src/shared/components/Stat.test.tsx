import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { axe } from '../../test/axe';
import { renderWithProviders } from '../../test/utils';
import { Stat } from './Stat';

describe('Stat', () => {
  it('renders label and value', () => {
    renderWithProviders(<Stat label="Orders today" value="42" />);
    expect(screen.getByText('Orders today')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders trend chip with "up" direction', () => {
    renderWithProviders(
      <Stat label="Revenue" value="1,200 EGP" trend={{ direction: 'up', label: '+12%' }} />,
    );
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders trend chip with "down" direction', () => {
    renderWithProviders(
      <Stat label="Returns" value="3" trend={{ direction: 'down', label: '-2%' }} />,
    );
    expect(screen.getByText('-2%')).toBeInTheDocument();
  });

  it('renders trend chip with "flat" direction', () => {
    renderWithProviders(
      <Stat label="Pending" value="0" trend={{ direction: 'flat', label: 'No change' }} />,
    );
    expect(screen.getByText('No change')).toBeInTheDocument();
  });

  it('renders at size sm without crashing', () => {
    renderWithProviders(<Stat label="SKUs" value="120" size="sm" />);
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderWithProviders(<Stat label="Orders today" value="42" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
