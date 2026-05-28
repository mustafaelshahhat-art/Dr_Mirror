import {
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

import { authApi, type LoginInput, type RegisterInput, type SendOtpInput, type VerifyOtpInput } from './api';
import { AuthContext, type AuthContextValue } from './AuthContext';
import type { AuthUser } from './types';

/**
 * Sole owner of authenticated-user state. Runs the session-restore handshake
 * on mount (calls /auth/refresh once; the httpOnly cookie does the heavy
 * lifting). Wires the api-client's expiry handler so a downstream 401-refresh
 * failure flows back into React state.
 *
 * The refresh is attempted on every page load so that logged-in users who
 * land on or refresh a public route (e.g. /) keep their session. A 401
 * (no/expired cookie) is silently treated as "no active session".
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

  const updateProfile = useCallback(async (input: Parameters<typeof authApi.updateProfile>[0]) => {
    const next = await authApi.updateProfile(input);
    setUser(next);
    return next;
  }, []);

  const deletePhone = useCallback(async () => {
    const next = await authApi.deletePhone();
    setUser(next);
    return next;
  }, []);

  const sendPhoneOtp = useCallback(async (input: SendOtpInput) => {
    return authApi.sendPhoneOtp(input);
  }, []);

  const verifyPhoneOtp = useCallback(async (input: VerifyOtpInput) => {
    const result = await authApi.verifyPhoneOtp(input);
    if (result.verified) {
      // Reload user state so phoneNumberConfirmed updates in the UI
      const refreshed = await authApi.me();
      setUser(refreshed);
    }
    return result;
  }, []);

  const refreshUser = useCallback(async () => {
    const refreshed = await authApi.me();
    setUser(refreshed);
  }, []);

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
      updateProfile,
      deletePhone,
      sendPhoneOtp,
      verifyPhoneOtp,
      refreshUser,
      logout,
    }),
    [user, isBootstrapping, isAdmin, login, register, updateProfile, deletePhone, sendPhoneOtp, verifyPhoneOtp, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
