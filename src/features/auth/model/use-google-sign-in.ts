import { useMutation } from '@tanstack/react-query';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';

import { api, setAccessToken } from '@shared/api';
import { GOOGLE_WEB_CLIENT_ID } from '@shared/config/environment';
import { getFirebaseAuth } from '@shared/lib/firebase';
import { saveRefreshToken } from '@shared/lib/secure-store';

interface LoginResponse {
  success: boolean;
  data: { codename: string; access_token: string; refresh_token: string };
}

let configured = false;

// Native Google account picker, then the Google ID token signs into Firebase,
// and the Firebase ID token goes to reovita-service for the VITA session.
function configureGoogleSignIn() {
  if (configured) return;
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      'Google sign-in is not configured. Add the SHA fingerprint in Firebase and re-download google-services.json.',
    );
  }
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  configured = true;
}

// Returns null when the user closes the account picker.
export function useGoogleSignIn() {
  return useMutation({
    mutationFn: async (): Promise<{ codename: string } | null> => {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase is not configured. Check .env.local.');

      configureGoogleSignIn();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return null;

      const idToken = response.data.idToken;
      if (!idToken) throw new Error('Google did not return an ID token.');

      const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      const firebaseIdToken = await credential.user.getIdToken();
      const { data } = await api.post<LoginResponse>('/v1/auth/login', { id_token: firebaseIdToken });
      setAccessToken(data.data.access_token);
      await saveRefreshToken(data.data.refresh_token);
      return { codename: data.data.codename };
    },
  });
}
