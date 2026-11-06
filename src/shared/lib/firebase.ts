import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { FIREBASE_CONFIG } from '../config/environment';

let cachedAuth: Auth | null = null;

// Returns null when the .env.local Firebase values are missing, so the app can show a clear message.
// On Android and iOS, sessions persist in AsyncStorage so the user stays signed in after a restart.
export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;
  if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) return null;

  const app: FirebaseApp =
    getApps()[0] ??
    initializeApp({
      apiKey: FIREBASE_CONFIG.apiKey,
      authDomain: FIREBASE_CONFIG.authDomain,
      projectId: FIREBASE_CONFIG.projectId,
      storageBucket: FIREBASE_CONFIG.storageBucket,
      messagingSenderId: FIREBASE_CONFIG.messagingSenderId,
      appId: FIREBASE_CONFIG.appId,
      measurementId: FIREBASE_CONFIG.measurementId,
    });

  cachedAuth =
    Platform.OS === 'web'
      ? getAuth(app)
      : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  return cachedAuth;
}
