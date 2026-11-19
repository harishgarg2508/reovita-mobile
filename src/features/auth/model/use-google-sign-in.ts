import { useMutation } from '@tanstack/react-query';

import { api, setAccessToken } from '@shared/api';
import { getGoogleFirebaseIdToken } from '@shared/lib/google-firebase-token';
import { saveRefreshToken } from '@shared/lib/secure-store';

interface LoginResponse {
  success: boolean;
  data: { codename: string; access_token: string; refresh_token: string };
}

// The message shown on the login screen. Raw Firebase and network errors are never shown; they are mapped to a short line.
export function friendlySignInError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  const message = (error as { message?: string } | null)?.message ?? '';
  if (code === 'auth/network-request-failed' || message === 'Network Error' || /network/i.test(message)) {
    return 'No internet connection. Check your network and try again.';
  }
  return 'Sign-in did not work. Please try again.';
}

// Returns null when the user closes the account picker.
export function useGoogleSignIn() {
  return useMutation({
    // reactivate: recover a deactivated account while signing in.
    mutationFn: async (options?: { reactivate?: boolean }): Promise<{ codename: string } | null> => {
      // The Google account chooser and the Firebase sign-in. Null when the person closes the chooser.
      const firebaseIdToken = await getGoogleFirebaseIdToken();
      if (!firebaseIdToken) return null;
      const { data } = await api.post<LoginResponse>('/v1/auth/login', {
        id_token: firebaseIdToken,
        reactivate: options?.reactivate === true,
      });
      setAccessToken(data.data.access_token);
      await saveRefreshToken(data.data.refresh_token);
      return { codename: data.data.codename };
    },
  });
}
