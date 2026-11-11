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

// Same idea for the iOS Firebase config. The value of GOOGLE_SERVICE_INFO_PLIST can be the raw
// plist XML, the same XML encoded as base64, or a path to a file. Without the variable, falls back
// to ./GoogleService-Info.plist if it exists, otherwise iOS prebuild has no config to point at.
const GENERATED_GOOGLE_SERVICE_INFO = path.join('.generated', 'GoogleService-Info.plist');

function resolveGoogleServiceInfoPlist(): string | undefined {
  const raw = process.env.GOOGLE_SERVICE_INFO_PLIST?.trim();
  if (!raw) {
    return fs.existsSync('./GoogleService-Info.plist') ? './GoogleService-Info.plist' : undefined;
  }

  if (!raw.startsWith('<') && fs.existsSync(raw)) return raw;

  const xml = raw.startsWith('<') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  if (!xml.includes('<plist')) throw new Error('GOOGLE_SERVICE_INFO_PLIST is not a valid plist');

  const target = path.resolve(GENERATED_GOOGLE_SERVICE_INFO);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, xml, 'utf8');
  return GENERATED_GOOGLE_SERVICE_INFO;
}

// The OAuth web client id (client_type 3) that Google Sign-In needs on Android to get an ID token.
// Firebase writes it into google-services.json once a SHA fingerprint and the Google provider exist.
function readGoogleWebClientId(servicesPath: string): string | undefined {
  try {
    const json = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
    const clients: { client_type: number; client_id: string }[] =
      json.client?.[0]?.oauth_client ?? [];
    return clients.find((client) => client.client_type === 3)?.client_id;
  } catch {
    return undefined;
  }
}

// Expo loads .env and .env.local before this file runs. Only the names listed in
// .env.example are passed through, so nothing else leaks into the app bundle.
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServicesFile = resolveGoogleServicesFile();
  const googleServiceInfoPlist = resolveGoogleServiceInfoPlist();
  return {
  ...(config as ExpoConfig),
  plugins: [...((config as ExpoConfig).plugins ?? []), './plugins/with-kotlin-version.js', './plugins/with-release-signing.js'],
  ios: {
    ...(config as ExpoConfig).ios,
    ...(googleServiceInfoPlist ? { googleServicesFile: googleServiceInfoPlist } : {}),
  },
  android: {
    ...(config as ExpoConfig).android,
    googleServicesFile,
  },
  extra: {
    // Keep app.json's extra (EAS project id, router options) alongside the values below.
    ...(config as ExpoConfig).extra,
    googleWebClientId: readGoogleWebClientId(googleServicesFile),
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
  };
};
