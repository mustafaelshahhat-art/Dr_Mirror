import { createContext } from 'react';

import type { LoginInput, RegisterInput, SendOtpInput, SendOtpResponse, UpdateProfileInput, VerifyOtpInput, VerifyOtpResponse } from './api';
import type { AuthUser } from './types';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the initial /auth/refresh attempt resolves. Block UI on this. */
  isBootstrapping: boolean;
  /** Memoized — `user?.roles.includes('Admin') ?? false`. */
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  updateProfile: (input: UpdateProfileInput) => Promise<AuthUser>;
  sendPhoneOtp: (input: SendOtpInput) => Promise<SendOtpResponse>;
  verifyPhoneOtp: (input: VerifyOtpInput) => Promise<VerifyOtpResponse>;
  /** Refresh user state from server (e.g. after phone verification). */
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
