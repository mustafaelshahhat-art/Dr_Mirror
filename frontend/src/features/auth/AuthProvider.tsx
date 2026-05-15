import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  clearAccessToken,
  setAccessToken,
  setAuthExpiredHandler,
} from '../../shared/lib/auth-storage';

import { authApi, type LoginInput, type RegisterInput } from './api';
import type { AuthUser } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the initial /auth/refresh attempt resolves. Block UI on this. */
  isBootstrapping: boolean;
  /** Memoized — `user?.roles.includes('Admin') ?? false`. */
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Sole owner of authenticated-user state. Runs the session-restore handshake
 * on mount (calls /auth/refresh once; the httpOnly cookie does the heavy
 * lifting). Wires the api-client's expiry handler so a downstream 401-refresh
 * failure flows back into React state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const queryClient = useQueryClient();

  const finishWithSession = useCallback((next: AuthUser, token: string) => {
    setAccessToken(token);
    setUser(next);
  }, []);

  const clearSession = useCallback(() => {
    clearAccessToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Session restore on app boot. /auth/refresh either succeeds (cookie valid)
  // or 401s (no/expired cookie). Either way, we resolve isBootstrapping.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await authApi.refresh();
        if (!cancelled) finishWithSession(r.user, r.accessToken);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession, finishWithSession]);

  // Hook for the api-client to drop us out of a session when refresh fails
  // mid-flight (e.g. server revoked all tokens after a reuse-detection event).
  useEffect(() => {
    setAuthExpiredHandler(() => clearSession());
    return () => setAuthExpiredHandler(null);
  }, [clearSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      const r = await authApi.login(input);
      finishWithSession(r.user, r.accessToken);
      return r.user;
    },
    [finishWithSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const r = await authApi.register(input);
      finishWithSession(r.user, r.accessToken);
      return r.user;
    },
    [finishWithSession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the server call fails, clear local state — we don't trust the cookie anymore.
    }
    clearSession();
  }, [clearSession]);

  const isAdmin = useMemo(() => user?.roles.includes('Admin') ?? false, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isBootstrapping,
      isAdmin,
      login,
      register,
      logout,
    }),
    [user, isBootstrapping, isAdmin, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
