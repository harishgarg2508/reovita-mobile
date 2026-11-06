import { useMutation } from '@tanstack/react-query';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { api } from '@shared/api';
import { getFirebaseAuth } from '@shared/lib/firebase';

interface LoginResponse {
  success: boolean;
  data: { codename: string };
}

// Google sign-in through Firebase, then the Firebase ID token goes to reovita-service.
// Popup sign-in works in the web build. Native builds need a Google sign-in SDK.
export function useGoogleSignIn() {
  return useMutation({
    mutationFn: async () => {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase is not configured. Check .env.local.');
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await credential.user.getIdToken();
      const { data } = await api.post<LoginResponse>('/v1/auth/login', { id_token: idToken });
      return data.data;
    },
  });
}
