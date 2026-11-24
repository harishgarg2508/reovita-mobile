import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { api } from '@shared/api';
import { getFirebaseAuth } from '@shared/lib/firebase';

export interface AccountIdentity {
  // The name on the person's Google account, or null.
  displayName: string | null;
  // The picture on the person's Google account (an address on Google's servers), or null.
  photoUrl: string | null;
}

interface ServerIdentity {
  display_name: string | null;
  picture_url: string | null;
}

async function fetchIdentity(): Promise<ServerIdentity> {
  const { data } = await api.get<ServerIdentity>('/v1/subjects/identity');
  return data;
}

function fromFirebase(): AccountIdentity {
  const user = getFirebaseAuth()?.currentUser;
  const name = user?.displayName?.trim();
  return { displayName: name ? name : null, photoUrl: user?.photoURL ?? null };
}

// The name and picture of the signed-in account. They are read from the server every time the greeting is shown (nothing is reused from an earlier
// visit). Until the server answers, or when it has none, the phone's own Google sign-in is used. Only the greeting reads them (see DashboardGreeting).
export function useAccountIdentity(): AccountIdentity {
  const [fallback, setFallback] = useState<AccountIdentity>(fromFirebase);
  const query = useQuery({ queryKey: ['account', 'identity'] as const, queryFn: fetchIdentity, staleTime: 0, gcTime: 0, retry: false });

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return auth.onAuthStateChanged(() => setFallback(fromFirebase()));
  }, []);

  const name = query.data?.display_name?.trim() || fallback.displayName;
  return {
    displayName: name ? name : null,
    photoUrl: query.data?.picture_url ?? fallback.photoUrl,
  };
}
