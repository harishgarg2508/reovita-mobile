import { create, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';

import { API_URL } from '../config/environment';
import { getFirebaseAuth } from '../lib/firebase';
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

// Signs in again without the user, from the Firebase sign-in the device still holds. Firebase keeps its own long-lived sign-in and
// renews its ID token (which lasts one hour) by itself when it is asked for one, so a fresh ID token is always available while the
// user is signed in to Firebase. That ID token goes to the server exactly as at sign-in, and a new VITA session comes back.
// Returns null when there is no Firebase sign-in, or the server does not accept it; it rejects when the network is the problem.
async function signInFromFirebase(): Promise<SessionTokens | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  // Firebase restores its saved sign-in a moment after start-up, so wait for that (not for long).
  const ready = (auth as { authStateReady?: () => Promise<void> }).authStateReady?.();
  if (ready) await Promise.race([ready, new Promise<void>((resolve) => setTimeout(resolve, 3000))]);
  const user = auth.currentUser;
  if (!user) return null;

  let idToken: string;
  try {
    // getIdToken renews the token when it has expired or is about to.
    idToken = await user.getIdToken();
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/network-request-failed') throw new Error('refresh_unavailable');
    return null;
  }
  try {
    const { data } = await plain.post<{ data: SessionTokens }>('/v1/auth/login', { id_token: idToken });
    setAccessToken(data.data.access_token);
    if (Platform.OS !== 'web') await saveRefreshToken(data.data.refresh_token);
    return data.data;
  } catch (error) {
    const status = (error as AxiosError).response?.status;
    if (status !== undefined && status >= 400 && status < 500) return null;
    throw new Error('refresh_unavailable');
  }
}

// Exchanges the refresh token for a new access token (POST /v1/auth/refresh). Concurrent callers share one request.
// Resolves to the new session, or to null when the user really has to sign in again.
// It REJECTS when the server could not be asked (no network, a timeout, a server error): that is not a sign-out, the refresh
// token is kept, and the next request tries again.
//   - A phone sends the refresh token it keeps in secure storage.
//   - The browser has no storage of its own for it: its refresh token is an HttpOnly cookie that goes with the request.
// When the refresh token is missing or refused, the Firebase sign-in on the device is tried before giving up (signInFromFirebase).
// The exception is a token the server saw used twice: that sign-in was ended on purpose, so it is not silently reopened.
export function refreshSession(): Promise<SessionTokens | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const stored = await getRefreshToken();
      let reasonToStop = false;
      if (stored || Platform.OS === 'web') {
        try {
          const { data } = await plain.post<{ data: SessionTokens }>('/v1/auth/refresh', stored ? { refresh_token: stored } : {});
          setAccessToken(data.data.access_token);
          if (stored || Platform.OS !== 'web') await saveRefreshToken(data.data.refresh_token);
          return data.data;
        } catch (error) {
          const response = (error as AxiosError).response;
          const status = response?.status;
          // Only the server saying the token is no good ends this sign-in.
          if (status !== 400 && status !== 401 && status !== 403) throw new Error('refresh_unavailable');
          await clearRefreshToken();
          reasonToStop = (response?.data as { error?: string } | undefined)?.error === 'refresh_token_reused';
        }
      }
      return reasonToStop ? null : signInFromFirebase();
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
      let session: SessionTokens | null;
      try {
        session = await refreshSession();
      } catch {
        // The server could not be reached to renew the session. The user stays signed in; this request just fails.
        return Promise.reject(mapApiError(error));
      }
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
