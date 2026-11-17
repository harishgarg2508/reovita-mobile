import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { useAppDispatch, persistor } from '@app-root/store';
import { consentFlowReset } from '@entities/consent';
import { onboardingDraftsReset } from '@entities/onboarding';
import { sessionCleared } from '@entities/session';
import { api, signOutLocally } from '@shared/api';
import { clearRefreshToken, getRefreshToken } from '@shared/lib';
import { getFirebaseAuth } from '@shared/lib/firebase';

// Signs the user out everywhere on this device:
// server session cookie, stored refresh token, in-memory access token,
// Redux state, persisted Redux data in device storage, and the query cache.
export function useSignOut() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(async () => {
    // The server clears the HttpOnly access-token cookie. A failure here must not block sign-out.
    // The refresh token is sent so the server ends this sign-in too, not only the cookie.
    try {
      const refreshToken = await getRefreshToken();
      await api.post('/v1/auth/logout', { refresh_token: refreshToken ?? undefined });
    } catch {
      // Ignored: the local state is cleared below either way.
    }

    await clearRefreshToken();
    signOutLocally();
    // The Firebase sign-in is ended too. The app signs in again from it without asking when a session runs out, so a user who has
    // chosen to log out must not be left signed in to Firebase.
    await getFirebaseAuth()?.signOut().catch(() => undefined);
    // Clears the Google account choice so the next sign-in shows the picker again. Best effort.
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignored: the VITA session is already cleared.
    }

    dispatch(sessionCleared());
    dispatch(consentFlowReset());
    dispatch(onboardingDraftsReset());

    // Remove the persisted slices (consent, onboarding) from device storage.
    await persistor.purge();
    queryClient.clear();

    router.replace('/(auth)/login');
  }, [dispatch, queryClient, router]);
}
