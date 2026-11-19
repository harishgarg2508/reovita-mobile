import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { Platform } from 'react-native';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

import { GOOGLE_WEB_CLIENT_ID } from '@shared/config/environment';

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
export async function getGoogleFirebaseIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase is not configured. Check .env.local.');

  if (Platform.OS === 'web') {
    // The native Google library has no web implementation, so the browser popup signs in instead.
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      return await credential.user.getIdToken();
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/popup-closed-by-user') return null;
      throw error;
    }
  }

  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  // Clear the cached Google account first, so the account chooser shows every time.
  await GoogleSignin.signOut().catch(() => undefined);
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;

  const idToken = response.data.idToken;
  if (!idToken) throw new Error('Google did not return an ID token.');

  const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  return credential.user.getIdToken();
}
