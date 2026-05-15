import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import {
  clearAccessToken,
  getAccessToken,
  notifyAuthExpired,
  setAccessToken,
} from './auth-storage';
import { setForbiddenMessage } from './forbidden-store';

/**
 * Single axios instance for the app.
 *
 * In dev, requests to `/api/*` are proxied to the .NET backend via vite.config.ts.
 * In prod, set VITE_API_BASE_URL to the deployed backend URL.
 *
 * `withCredentials: true` is essential — the refresh cookie must ride along
 * with every request (Path=/api/auth on the cookie limits its surface).
 */
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

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

    // Don't refresh-and-retry for the auth endpoints themselves.
    const isAuthEndpoint =
      url.includes(REFRESH_PATH) ||
      url.includes(LOGIN_PATH) ||
      url.includes(REGISTER_PATH) ||
      url.includes(LOGOUT_PATH);

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
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

    return Promise.reject(error);
  },
);
