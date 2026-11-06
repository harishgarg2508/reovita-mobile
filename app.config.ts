import fs from 'node:fs';
import path from 'node:path';

import type { ConfigContext, ExpoConfig } from 'expo/config';

// Where the generated Android config is written. It is git-ignored.
const GENERATED_GOOGLE_SERVICES = path.join('.generated', 'google-services.json');

// Resolves the Firebase Android config from the GOOGLE_SERVICES_JSON env var, so the file
// never has to live in the repo. The value can be:
//   - the raw JSON text,
//   - the same JSON encoded as base64,
//   - a path to a file (EAS file-type env vars arrive this way).
// Without the variable, falls back to ./google-services.json for local development.
function resolveGoogleServicesFile(): string {
  const raw = process.env.GOOGLE_SERVICES_JSON?.trim();
  if (!raw) return './google-services.json';

  if (!raw.startsWith('{') && fs.existsSync(raw)) return raw;

  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  JSON.parse(json); // fails the config load early if the value is not valid JSON

  const target = path.resolve(GENERATED_GOOGLE_SERVICES);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, json, 'utf8');
  return GENERATED_GOOGLE_SERVICES;
}

// Expo loads .env and .env.local before this file runs. Only the names listed in
// .env.example are passed through, so nothing else leaks into the app bundle.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...(config as ExpoConfig).android,
    googleServicesFile: resolveGoogleServicesFile(),
  },
  extra: {
    firebase: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    },
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  },
});
