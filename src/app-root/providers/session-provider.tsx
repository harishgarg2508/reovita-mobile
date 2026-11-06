import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, type PropsWithChildren } from 'react';

import { useAppDispatch } from '@app-root/store';
import { sessionCleared } from '@entities/session';
import { getFirebaseAuth } from '@shared/lib/firebase';

// Keeps the app's session in step with Firebase. If Firebase has no signed-in user
// (signed out, or the saved login was removed), the session is cleared and the gate sends the user to login.
export function SessionProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (user) => {
      if (!user) dispatch(sessionCleared());
    });
  }, [dispatch]);

  return <>{children}</>;
}
