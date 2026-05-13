/**
 * Wire types for the auth slice. These shapes mirror the backend DTOs
 * (`Features/Auth/Common/AuthDtos.cs`) exactly — never drift them.
 */

export type AppRole = 'Admin' | 'Vendor' | 'Buyer';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: AppRole[];
  createdAt: string; // ISO 8601 with offset
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: AuthUser;
}

/**
 * Per RFC 7807 — what the backend's ProblemDetails middleware emits. Used to
 * surface useful inline errors to the user (e.g. "Email already registered").
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}
