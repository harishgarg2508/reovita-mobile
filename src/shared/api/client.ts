import { create, type InternalAxiosRequestConfig } from 'axios';

import { API_URL } from '../config/environment';
import { clearRefreshToken, getRefreshToken, saveRefreshToken } from '../lib/secure-store';
import { getAccessToken, notifyUnauthorized, setAccessToken } from './auth-client';
import { mapApiError } from './errors';

interface SessionTokens {
  codename: string;
  access_token: string;
  refresh_token: string;
}

// The only axios instance in the app. Import `api` from '@shared/api'.
export const api = create({
  baseURL: API_URL,
  timeout: 30_000,
  // The web build also gets the HttpOnly cookie set by login.
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

// Used only for the refresh call itself, so a failed refresh cannot loop back into this interceptor.
const plain = create({ baseURL: API_URL, timeout: 30_000, withCredentials: true });

let refreshing: Promise<SessionTokens | null> | null = null;

// Exchanges the stored refresh token for a new access token (POST /v1/auth/refresh).
// Concurrent callers share one request. Returns null when there is no valid refresh token.
export function refreshSession(): Promise<SessionTokens | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const token = await getRefreshToken();
      if (!token) return null;
      try {
        const { data } = await plain.post<{ data: SessionTokens }>('/v1/auth/refresh', { refresh_token: token });
        setAccessToken(data.data.access_token);
        await saveRefreshToken(data.data.refresh_token);
        return data.data;
      } catch {
        await clearRefreshToken();
        return null;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as RetryableConfig | undefined;
    const isAuthCall = config?.url?.startsWith('/v1/auth/') ?? false;
    if (error?.response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      const session = await refreshSession();
      if (session) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        return api(config);
      }
      notifyUnauthorized();
    } else if (error?.response?.status === 401) {
      notifyUnauthorized();
    }
    return Promise.reject(mapApiError(error));
  },
);
