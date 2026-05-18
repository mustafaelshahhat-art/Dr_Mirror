import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../lib/i18n';
import { useApiErrorToast } from './useApiErrorToast';

const addToastMock = vi.hoisted(() => vi.fn());

vi.mock('@heroui/react/toast', () => ({
  toast: { danger: addToastMock },
}));

vi.mock('../lib/sentry', () => ({
  Sentry: { addBreadcrumb: vi.fn() },
}));

interface TestProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
}

describe('useApiErrorToast', () => {
  beforeEach(async () => {
    addToastMock.mockClear();
    await i18n.changeLanguage('en');
  });

  it('renders mapped signal translations without server detail', () => {
    const { result } = renderHook(() => useApiErrorToast(), { wrapper });
    const error = axiosError(404, {
      title: 'Order not found',
      detail: 'Raw server order detail',
    });

    act(() => result.current(error));

    expect(addToastMock).toHaveBeenCalledWith('We could not find that order.');
    expect(addToastMock.mock.calls[0][0]).not.toBe('Raw server order detail');
  });

  it('renders the generic fallback for unmapped signals', () => {
    const { result } = renderHook(() => useApiErrorToast(), { wrapper });
    const error = axiosError(418, {
      title: 'Unexpected teapot',
      detail: 'Raw teapot detail',
    });

    act(() => result.current(error));

    expect(addToastMock.mock.calls[0][0]).toBe('Something went wrong. Please try again.');
    expect(addToastMock.mock.calls[0][0]).not.toBe('Raw teapot detail');
  });

  it('renders the generic fallback for network errors', () => {
    const { result } = renderHook(() => useApiErrorToast(), { wrapper });

    act(() => result.current({ isAxiosError: true, message: 'Network Error' }));

    expect(addToastMock.mock.calls[0][0]).toBe('Something went wrong. Please try again.');
  });

  it('renders the generic fallback for non-Axios thrown values', () => {
    const { result } = renderHook(() => useApiErrorToast(), { wrapper });

    act(() => result.current(new Error('Local failure detail')));

    expect(addToastMock.mock.calls[0][0]).toBe('Something went wrong. Please try again.');
    expect(addToastMock.mock.calls[0][0]).not.toBe('Local failure detail');
  });
});

function wrapper({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

function axiosError(status: number, data: TestProblemDetails) {
  return {
    isAxiosError: true,
    response: { status, data },
    toJSON: () => ({}),
  };
}
