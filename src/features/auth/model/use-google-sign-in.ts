import { useMutation } from '@tanstack/react-query';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { api, setAccessToken } from '@shared/api';
import { saveRefreshToken } from '@shared/lib/secure-store';
import { getFirebaseAuth } from '@shared/lib/firebase';

interface LoginResponse {
  success: boolean;
  data: { codename: string; access_token: string; refresh_token: string };
}

// Google sign-in through Firebase, then the Firebase ID token goes to reovita-service.
// The server returns the access token (kept in memory) and the refresh token (kept in secure storage).
export function useGoogleSignIn() {
  return useMutation({
    mutationFn: async () => {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase is not configured. Check .env.local.');
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await credential.user.getIdToken();
      const { data } = await api.post<LoginResponse>('/v1/auth/login', { id_token: idToken });
      setAccessToken(data.data.access_token);
      await saveRefreshToken(data.data.refresh_token);
      return { codename: data.data.codename };
    },
  });
}
