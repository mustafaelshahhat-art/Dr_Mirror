/**
 * Auth token storage.
 *
 * Access token: kept in module-scoped memory only (cleared on reload). The
 *   axios interceptor obtains a new access token via the refresh cookie on
 *   401, then retries the original request once.
 * Refresh token: server-issued httpOnly cookie. JS cannot read it. Rotation
 *   on use is enforced server-side.
 *
 * The `onAuthExpired` callback is set by `AuthProvider` so the interceptor
 * can notify React-land when the refresh chain finally fails (forcing logout).
 */

let accessToken: string | null = null;
let onAuthExpired: (() => void) | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export function setAuthExpiredHandler(handler: (() => void) | null): void {
  onAuthExpired = handler;
}

export function notifyAuthExpired(): void {
  onAuthExpired?.();
}
