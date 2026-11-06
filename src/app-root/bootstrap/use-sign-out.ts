import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useAppDispatch, persistor } from '@app-root/store';
import { consentFlowReset } from '@entities/consent';
import { onboardingDraftsReset } from '@entities/onboarding';
import { sessionCleared } from '@entities/session';
import { api, signOutLocally } from '@shared/api';
import { clearRefreshToken } from '@shared/lib';

// Signs the user out everywhere on this device:
// server session cookie, stored refresh token, in-memory access token,
// Redux state, persisted Redux data in device storage, and the query cache.
export function useSignOut() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(async () => {
    // The server clears the HttpOnly access-token cookie. A failure here must not block sign-out.
    try {
      await api.post('/v1/auth/logout');
    } catch {
      // Ignored: the local state is cleared below either way.
    }

    await clearRefreshToken();
    signOutLocally();

    dispatch(sessionCleared());
    dispatch(consentFlowReset());
    dispatch(onboardingDraftsReset());

    // Remove the persisted slices (consent, onboarding) from device storage.
    await persistor.purge();
    queryClient.clear();

    router.replace('/(auth)/login');
  }, [dispatch, queryClient, router]);
}
