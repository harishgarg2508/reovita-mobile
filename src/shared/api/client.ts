import { create } from 'axios';

import { API_URL } from '../config/environment';
import { getAccessToken, notifyUnauthorized } from './auth-client';
import { mapApiError } from './errors';

// The only axios instance in the app. Import `api` from '@shared/api'.
export const api = create({
  baseURL: API_URL,
  timeout: 30_000,
  // Login sets an HttpOnly cookie; keep sending it alongside the bearer token.
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      notifyUnauthorized();
    }
    return Promise.reject(mapApiError(error));
  },
);
