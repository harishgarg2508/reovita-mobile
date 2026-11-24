import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, inMemoryPersistence, initializeAuth, signInWithCredential, signInWithPopup, type Auth } from 'firebase/auth';
import { Platform } from 'react-native';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

import { FIREBASE_CONFIG, GOOGLE_WEB_CLIENT_ID } from '@shared/config/environment';

import { getFirebaseAuth } from './firebase';

let configured = false;

function configureGoogleSignIn() {
  if (configured) return;
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google sign-in is not configured. Add the SHA fingerprint in Firebase and re-download google-services.json.');
  }
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  configured = true;
}

// Shows the Google account chooser, signs the person into Firebase with the account they pick, and returns a fresh Firebase ID token.
// It is used for the first sign-in and for signing in again to confirm the account holder. Returns null when the person closes the
// chooser. The account chooser always shows, so the person can pick the account they mean.
// The last Google sign-in error code seen on this device, shown under a failed step so the cause can be read.
let lastSignInError = '';
export function lastGoogleSignInErrorCode(): string {
  return lastSignInError;
}

// `confirmAs`: the email of the account that must confirm (the account holder). On the web the chooser then starts on that account, so the
// holder picks their own Google account; it can still be changed in the chooser, and the server refuses a different account.
export async function getGoogleFirebaseIdToken(options?: { confirmAs?: string | null }): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase is not configured. Check .env.local.');

  if (Platform.OS === 'web') {
    // The native Google library has no web implementation, so the browser popup signs in instead.
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters(options?.confirmAs ? { prompt: 'select_account', login_hint: options.confirmAs } : { prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      return await credential.user.getIdToken();
    } catch (error) {
      const code = (error as { code?: string }).code ?? (error as Error).message ?? 'unknown';
      lastSignInError = code;
      if (code === 'auth/popup-closed-by-user') return null;
      throw error;
    }
  }

  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  // Clear the cached Google account first, so the account chooser shows every time.
  await GoogleSignin.signOut().catch(() => undefined);
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    lastSignInError = 'chooser closed';
    return null;
  }

  const idToken = response.data.idToken;
  if (!idToken) throw new Error('Google did not return an ID token.');

  const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  return credential.user.getIdToken();
}

// A second Firebase sign-in, kept apart from the person's own. It is used only to get the ID token of a child account being linked to this account:
// the child's Google account is signed in here, its token is taken, and the sign-in is dropped at once. It never replaces the sign-in this phone
// (or browser) keeps for the account holder, and nothing about it is stored on the device.
let linkAuth: Auth | null = null;

function linkingAuth(): Auth {
  if (linkAuth) return linkAuth;
  const app =
    getApps().find((candidate) => candidate.name === 'linking') ??
    initializeApp(
      { apiKey: FIREBASE_CONFIG.apiKey, authDomain: FIREBASE_CONFIG.authDomain, projectId: FIREBASE_CONFIG.projectId, appId: FIREBASE_CONFIG.appId },
      'linking',
    );
  // The sign-in lives in memory only: nothing is written to storage, and it is gone when the app closes.
  linkAuth = Platform.OS === 'web' ? getAuth(app) : initializeAuth(app, { persistence: inMemoryPersistence });
  return linkAuth;
}

// The Firebase ID token of the Google account a person picks for a child, for linking. Returns null when the person closes the chooser. The chooser
// always shows. The child's sign-in is dropped as soon as its token is taken.
export async function getGoogleIdTokenForLink(): Promise<string | null> {
  const auth = linkingAuth();
  if (Platform.OS === 'web') {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      const token = await credential.user.getIdToken();
      await auth.signOut().catch(() => undefined);
      return token;
    } catch (error) {
      const code = (error as { code?: string }).code ?? (error as Error).message ?? 'unknown';
      lastSignInError = code;
      if (code === 'auth/popup-closed-by-user') return null;
      throw error;
    }
  }

  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  await GoogleSignin.signOut().catch(() => undefined);
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    lastSignInError = 'chooser closed';
    return null;
  }
  const idToken = response.data.idToken;
  if (!idToken) throw new Error('Google did not return an ID token.');
  const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  const token = await credential.user.getIdToken();
  await auth.signOut().catch(() => undefined);
  return token;
}
