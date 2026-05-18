import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import {
  clearAccessToken,
  getAccessToken,
  notifyAuthExpired,
  setAccessToken,
} from './auth-storage';
import { setForbiddenMessage } from './forbidden-store';
import { setRateLimitState } from './rate-limit-store';

/**
 * Single axios instance for the app.
 *
 * In dev, requests to `/api/*` are proxied to the .NET backend via vite.config.ts.
 * In prod, set VITE_API_BASE_URL to the deployed backend origin or /api path.
 *
 * `withCredentials: true` is essential — the refresh cookie must ride along
 * with every request (Path=/api/auth on the cookie limits its surface).
 */
export function normalizeApiBaseUrl(raw: string | null | undefined): string {
  const value = raw?.trim();
  if (!value) return '/api';

  const withoutTrailingSlash = value.replace(/\/+$/, '');
  if (!withoutTrailingSlash) return '/api';
  if (/\/api$/i.test(withoutTrailingSlash)) return withoutTrailingSlash;

  return `${withoutTrailingSlash}/api`;
}

const baseURL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const api = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// -----------------------------------------------------------------------------
// Request interceptor: attach access token if present.
// -----------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// -----------------------------------------------------------------------------
// Response interceptor: on a single 401, attempt /auth/refresh once, retry the
// original request with the new access token, then surface the result. If the
// refresh call itself 401s, we declare the session over and notify React.
// -----------------------------------------------------------------------------
type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

const REFRESH_PATH = '/auth/refresh';
const LOGIN_PATH = '/auth/login';
const REGISTER_PATH = '/auth/register';
const LOGOUT_PATH = '/auth/logout';

const AUTH_PATH_SUFFIXES = [REFRESH_PATH, LOGIN_PATH, REGISTER_PATH, LOGOUT_PATH] as const;

/**
 * Anchored exact-suffix match: the configured `url` must end with one of the
 * four auth paths, AFTER any query string has been stripped. Substring matching
 * would misclassify synthetic endpoints like `/api/auth-debug-ping` or
 * `/api/orders/auth-info` as auth endpoints and silently skip refresh-and-retry.
 */
function isAuthEndpoint(url: string): boolean {
  if (!url) return false;
  const pathOnly = url.split(/[?#]/, 1)[0] ?? '';
  return AUTH_PATH_SUFFIXES.some((suffix) => pathOnly.endsWith(suffix));
}

// Test-only export so vitest can target the matcher without monkey-patching axios.
export const __isAuthEndpointForTests = isAuthEndpoint;

// Single-flight refresh: if many parallel calls fail with 401 concurrently we
// only want one /refresh request in flight. The rest await this promise.
let inflightRefresh: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  if (!inflightRefresh) {
    inflightRefresh = (async () => {
      try {
        const r = await axios.post(`${baseURL}${REFRESH_PATH}`, undefined, {
          withCredentials: true,
        });
        const token = (r.data as { accessToken?: string })?.accessToken;
        if (token) {
          setAccessToken(token);
          return token;
        }
        return null;
      } catch {
        return null;
      } finally {
        // Allow a new refresh to start later.
        // Defer clearing until microtask so awaiters in this tick all see the same result.
        queueMicrotask(() => {
          inflightRefresh = null;
        });
      }
    })();
  }
  return inflightRefresh;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    if (status === 401 && original && !original._retry && !isAuthEndpoint(url)) {
      original._retry = true;
      const newToken = await performRefresh();
      if (newToken) {
        original.headers = {
          ...(original.headers ?? {}),
          Authorization: `Bearer ${newToken}`,
        };
        return api.request(original);
      }
      clearAccessToken();
      notifyAuthExpired();
    }

    if (status === 403) {
      const detail = (error.response?.data as { detail?: string })?.detail ?? '';
      setForbiddenMessage(detail || 'Forbidden');
    }

    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
      if (!Number.isNaN(retryAfterSeconds)) {
        setRateLimitState({ retryAfterSeconds });
      }
    }

    return Promise.reject(error);
  },
);
