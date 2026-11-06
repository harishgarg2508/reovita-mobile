import { useEffect, type PropsWithChildren } from 'react';

import { useAppDispatch } from '@app-root/store';
import { sessionCleared, sessionReady } from '@entities/session';
import { api, refreshSession } from '@shared/api';

// On start-up the session is restored from the stored refresh token, then confirmed with the server.
// The app is signed in only when the server accepts the access token.
export function SessionProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await refreshSession();
      if (!session) {
        if (!cancelled) dispatch(sessionCleared());
        return;
      }
      try {
        await api.get('/v1/onboarding/status');
        if (!cancelled) dispatch(sessionReady({ subjectId: session.codename, codename: session.codename }));
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
