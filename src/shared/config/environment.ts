import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Values come from app.config.ts, which reads .env.local (see .env.example).
const extra = Constants.expoConfig?.extra as
  | { firebase: Record<string, string | undefined>; apiBaseUrl: string; googleWebClientId?: string }
  | undefined;

// While developing in the browser the API is always the local backend. The address would otherwise come from a build-time setting
// that a cached bundle can keep, which sent development traffic to production. A phone build still uses NEXT_PUBLIC_API_BASE_URL
// from .env.local (a phone needs the PC's address on the network, not localhost), and so does a production build.
const LOCAL_API_URL = 'http://localhost:3000';
const apiBaseUrl = __DEV__ && Platform.OS === 'web' ? LOCAL_API_URL : extra?.apiBaseUrl;
if (!apiBaseUrl) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not set. Add it to .env.local and restart Expo.');
}
export const API_URL: string = apiBaseUrl;
export const FIREBASE_CONFIG = extra?.firebase ?? {};
export const GOOGLE_WEB_CLIENT_ID: string | undefined = extra?.googleWebClientId;
