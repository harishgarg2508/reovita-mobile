import Constants from 'expo-constants';

// Values come from app.config.ts, which reads .env.local (see .env.example).
const extra = Constants.expoConfig?.extra as
  | { firebase: Record<string, string | undefined>; apiBaseUrl: string; googleWebClientId?: string }
  | undefined;

// The backend address comes from NEXT_PUBLIC_API_BASE_URL in .env.local (see app.config.ts), the same in the browser and on a phone.
// It is read when the dev server starts, so after changing it restart with npm run start:clear.
const apiBaseUrl = extra?.apiBaseUrl;
if (!apiBaseUrl) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not set. Add it to .env.local and restart Expo.');
}
export const API_URL: string = apiBaseUrl;
export const FIREBASE_CONFIG = extra?.firebase ?? {};
export const GOOGLE_WEB_CLIENT_ID: string | undefined = extra?.googleWebClientId;
