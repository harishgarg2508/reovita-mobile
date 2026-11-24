import { useEffect, useState } from 'react';

import { getFirebaseAuth } from '@shared/lib/firebase';

export interface AccountIdentity {
  // The name on the person's Google account, or null.
  displayName: string | null;
  // The picture on the person's Google account (an address on Google's servers), or null.
  photoUrl: string | null;
}

function read(): AccountIdentity {
  const user = getFirebaseAuth()?.currentUser;
  const name = user?.displayName?.trim();
  return { displayName: name ? name : null, photoUrl: user?.photoURL ?? null };
}

// The name and the picture on the person's Google account, for the person who is signed in to this device only. They come from the Firebase sign-in the device already
// holds, are never sent to the service, and are never logged. The project rule is that the name is shown to app-shell only (the greeting at the top of the dashboard);
// no other slice reads it, and it is not put in the store.
export function useAccountIdentity(): AccountIdentity {
  const [identity, setIdentity] = useState<AccountIdentity>(read);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return auth.onAuthStateChanged((user) => {
      const name = user?.displayName?.trim();
      setIdentity({ displayName: name ? name : null, photoUrl: user?.photoURL ?? null });
    });
  }, []);

  return identity;
}
