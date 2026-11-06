import Constants from 'expo-constants';

// Values come from app.config.ts, which reads .env.local (see .env.example).
const extra = Constants.expoConfig?.extra as
  | { firebase: Record<string, string | undefined>; apiBaseUrl: string }
  | undefined;

export const API_URL: string = extra?.apiBaseUrl ?? 'http://localhost:3000';
export const FIREBASE_CONFIG = extra?.firebase ?? {};
