import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, type PropsWithChildren } from 'react';

import { persistor, useAppDispatch } from '@app-root/store';
import { consentFlowReset } from '@entities/consent';
import { onboardingDraftsReset } from '@entities/onboarding';
import { sessionCleared, sessionReady } from '@entities/session';
import { api, refreshSession, setUnauthorizedHandler } from '@shared/api';
import { clearRefreshToken } from '@shared/lib';

// On start-up the app asks the server whether it is signed in. The access token is an HttpOnly
// cookie set at login, so the app cannot read it. The request below sends that cookie (and the
// stored Bearer token when there is one), and the server answers with 200 only for a valid session.
export function SessionProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  // A 401 that the refresh could not fix means the session is gone: clear everything and show login.
  // The logout endpoint is not called here, since it could answer 401 too.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(sessionCleared());
      dispatch(consentFlowReset());
      dispatch(onboardingDraftsReset());
      void clearRefreshToken();
      void persistor.purge();
      queryClient.clear();
      router.replace('/');
    });
  }, [dispatch, queryClient]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Restores the Bearer token from the stored refresh token, when the platform has one (native).
      const session = await refreshSession();
      try {
        await api.get('/v1/onboarding/status');
        if (!cancelled) {
          dispatch(sessionReady({ subjectId: session?.codename ?? null, codename: session?.codename ?? null }));
        }
      } catch {
        if (!cancelled) dispatch(sessionCleared());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return <>{children}</>;
}
