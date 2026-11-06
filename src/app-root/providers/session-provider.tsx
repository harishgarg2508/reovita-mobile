import { useEffect, type PropsWithChildren } from 'react';

import { useAppDispatch } from '@app-root/store';
import { sessionCleared, sessionReady } from '@entities/session';
import { api, refreshSession } from '@shared/api';

// On start-up the app asks the server whether it is signed in. The access token is an HttpOnly
// cookie set at login, so the app cannot read it. The request below sends that cookie (and the
// stored Bearer token when there is one), and the server answers with 200 only for a valid session.
export function SessionProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();

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
