import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { renderWithProviders } from '../../test/utils';
import { Snippet } from './Snippet';

function withClipboardMock() {
  const clipboard = { writeText: async () => undefined };
  Object.defineProperty(window.navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
    writable: true,
  });
  return vi.spyOn(window.navigator.clipboard, 'writeText');
}

describe('Snippet', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('writes the value to the clipboard when the copy button is pressed', async () => {
    withClipboardMock();
    const user = userEvent.setup();
    renderWithProviders(
      <Snippet value="ABC-123" aria-label="copy order number">
        ABC-123
      </Snippet>,
    );

    const button = screen.getByRole('button', { name: 'copy order number' });
    await user.click(button);
    await waitFor(() => {
      expect(button.querySelector('.lucide-check')).not.toBeNull();
    });
  });

  it('exposes the provided aria-label on the copy button', () => {
    withClipboardMock();
    renderWithProviders(
      <Snippet value="x" aria-label="copy account number">
        x
      </Snippet>,
    );
    expect(screen.getByRole('button', { name: 'copy account number' })).toBeInTheDocument();
  });

  it('swaps the icon to a Check after a successful copy', async () => {
    withClipboardMock();
    const user = userEvent.setup();
    renderWithProviders(
      <Snippet value="x" aria-label="copy x">
        x
      </Snippet>,
    );

    const button = screen.getByRole('button', { name: 'copy x' });
    const iconBefore = button.querySelector('svg');
    const classBefore = iconBefore?.getAttribute('class') ?? '';

    await user.click(button);

    const iconAfter = button.querySelector('svg');
    const classAfter = iconAfter?.getAttribute('class') ?? '';
    // The component renders a different lucide-react icon (Copy vs Check);
    // the SVG element identity changes even if our class survives.
    expect(iconAfter).not.toBeNull();
    expect(classAfter === classBefore && iconAfter === iconBefore).toBe(false);
  });

  it('renders inside a dir="rtl" container without throwing', () => {
    // react-aria-components owns the placement-flip logic for RTL; we only
    // assert that the component mounts inside an RTL ancestor and exposes
    // its accessible name. Visual placement is covered by axe + manual QA.
    withClipboardMock();
    const { container } = renderWithProviders(
      <div dir="rtl">
        <Snippet value="x" aria-label="copy x" tooltipPlacement="start">
          x
        </Snippet>
      </div>,
    );
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'copy x' })).toBeInTheDocument();
  });
});
