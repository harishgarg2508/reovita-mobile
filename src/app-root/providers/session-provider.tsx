import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, type PropsWithChildren } from 'react';

import { persistor, store, useAppDispatch } from '@app-root/store';
import { consentFlowReset } from '@entities/consent';
import { onboardingDraftsReset } from '@entities/onboarding';
import { sessionCleared, sessionReady } from '@entities/session';
import { api, isApiError, refreshSession, setUnauthorizedHandler } from '@shared/api';
import { clearRefreshToken, getRefreshToken } from '@shared/lib';
import { getFirebaseAuth } from '@shared/lib/firebase';

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
      // Only a session that was signed in is sent back to the landing page. At start-up (or when already signed out) the landing page
      // is already opening login, and sending it there again would show the splash and login a second time.
      const wasReady = store.getState().session.status === 'ready';
      dispatch(sessionCleared());
      dispatch(consentFlowReset());
      dispatch(onboardingDraftsReset());
      void clearRefreshToken();
      // The server did not accept the session, even after signing in again from Firebase: end that sign-in too, so it is not retried.
      void getFirebaseAuth()?.signOut().catch(() => undefined);
      void persistor.purge();
      queryClient.clear();
      if (wasReady) router.replace('/');
    });
  }, [dispatch, queryClient]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Restores the Bearer token from the stored refresh token (phone) or the refresh cookie (browser).
      // If the server cannot be reached the user is not signed out for it: a phone that holds a refresh token goes on as signed in.
      let session: Awaited<ReturnType<typeof refreshSession>> = null;
      let reachable = true;
      try {
        session = await refreshSession();
      } catch {
        reachable = false;
      }
      try {
        await api.get('/v1/onboarding/status');
        if (!cancelled) {
          dispatch(sessionReady({ subjectId: session?.codename ?? null, codename: session?.codename ?? null }));
        }
      } catch (err) {
        const stillSignedIn = !reachable && (await getRefreshToken()) !== null && !isApiError(err, 'unauthorized');
        if (!cancelled) {
          if (stillSignedIn) dispatch(sessionReady({ subjectId: null, codename: null }));
          else dispatch(sessionCleared());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return <>{children}</>;
}
