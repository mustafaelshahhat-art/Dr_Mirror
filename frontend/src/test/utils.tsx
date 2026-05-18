import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@heroui/react';
import { render, type RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { AuthContext } from '../features/auth/AuthContext';
import type { AuthContextValue } from '../features/auth/AuthContext';
import type { AuthUser } from '../features/auth/types';
import { CartProvider } from '../features/cart/CartProvider';
import testI18n from './testI18n';

// Keep in sync with src/app/providers.tsx — add providers here when added there.

export function makeAdminUser(): AuthUser {
  return {
    id: 'admin-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    roles: ['Admin'],
    createdAt: '2024-01-01T00:00:00+00:00',
  };
}

export function makeBuyerUser(): AuthUser {
  return {
    id: 'buyer-1',
    email: 'buyer@example.com',
    fullName: 'Buyer User',
    roles: ['Buyer'],
    createdAt: '2024-01-01T00:00:00+00:00',
  };
}

export function makeAuthValue(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    isAuthenticated: false,
    isBootstrapping: false,
    isAdmin: false,
    login: async () => makeBuyerUser(),
    register: async () => makeBuyerUser(),
    logout: async () => {},
    ...overrides,
  };
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  authValue?: AuthContextValue;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactNode,
  { route = '/', authValue, queryClient, ...renderOptions }: ProviderOptions = {},
) {
  const client = queryClient ?? makeQueryClient();
  const auth = authValue ?? makeAuthValue();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <I18nextProvider i18n={testI18n}>
          <ToastProvider />
          <MemoryRouter initialEntries={[route]}>
            <AuthContext.Provider value={auth}>
              <CartProvider>{children}</CartProvider>
            </AuthContext.Provider>
          </MemoryRouter>
        </I18nextProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
