import { api } from '../../shared/lib/api-client';

import type { AuthResponse, AuthUser } from './types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

export interface UpdateProfileInput {
  displayName: string;
  phone: string | null;
  email?: string | null;
}

export interface SendOtpInput {
  purpose?: 'profile' | 'checkout';
}

export interface SendOtpResponse {
  sessionId: string;
  status: string;
  maskedPhone: string | null;
}

export interface VerifyOtpInput {
  code: string;
  sessionId: string;
}

export interface VerifyOtpResponse {
  verified: boolean;
  error?: string | null;
}

export const authApi = {
  async login(input: LoginInput): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', input);
    return data;
  },

  async register(input: RegisterInput): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', input);
    return data;
  },

  async refresh(): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/refresh');
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async me(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>('/auth/me');
    return data;
  },

  async updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
    const { data } = await api.put<AuthUser>('/auth/me', input);
    return data;
  },

  async sendPhoneOtp(input: SendOtpInput): Promise<SendOtpResponse> {
    const { data } = await api.post<SendOtpResponse>('/auth/phone/verify/send', input);
    return data;
  },

  async verifyPhoneOtp(input: VerifyOtpInput): Promise<VerifyOtpResponse> {
    const { data } = await api.post<VerifyOtpResponse>('/auth/phone/verify', input);
    return data;
  },
};
