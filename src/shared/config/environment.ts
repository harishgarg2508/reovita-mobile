import Constants from 'expo-constants';

// Values come from app.config.ts, which reads .env.local (see .env.example).
const extra = Constants.expoConfig?.extra as
  | { firebase: Record<string, string | undefined>; apiBaseUrl: string; googleWebClientId?: string }
  | undefined;

// No default: the backend URL must come from NEXT_PUBLIC_API_BASE_URL in .env.local.
const apiBaseUrl = extra?.apiBaseUrl;
if (!apiBaseUrl) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not set. Add it to .env.local and restart Expo.');
}
export const API_URL: string = apiBaseUrl;
export const FIREBASE_CONFIG = extra?.firebase ?? {};
export const GOOGLE_WEB_CLIENT_ID: string | undefined = extra?.googleWebClientId;
