import { Redirect, useSegments } from 'expo-router';
import type { PropsWithChildren } from 'react';

import { useAppSelector } from '@app-root/store';
import { selectSessionStatus } from '@entities/session';

// Without a signed-in session only the landing page and the (auth) screens can be opened.
// Every other route goes to the landing page, which shows login.
export function AuthGuard({ children }: PropsWithChildren) {
  const status = useAppSelector(selectSessionStatus);
  const segments: string[] = useSegments();
  // The landing page has no segments.
  const isPublic = segments.length === 0 || segments[0] === '(auth)' || segments[0] === '+not-found';

  if (isPublic) return <>{children}</>;
  if (status === 'loading') return null;
  if (status === 'signed-out') return <Redirect href="/" />;
  return <>{children}</>;
}
