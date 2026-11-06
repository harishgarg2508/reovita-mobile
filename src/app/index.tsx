import { Redirect } from 'expo-router';
import { useCallback, useState } from 'react';

import { selectIsSignedIn } from '@entities/session';
import { useAppSelector } from '@app-root/store';
import { SplashScreen } from '@features/splash';

// Landing route: shows the splash, then goes to the dashboard (signed in) or login.
export default function LandingRoute() {
  const signedIn = useAppSelector(selectIsSignedIn);
  const [splashDone, setSplashDone] = useState(false);
  const onDone = useCallback(() => setSplashDone(true), []);

  if (!splashDone) return <SplashScreen onDone={onDone} />;
  return <Redirect href={signedIn ? '/(app)/(tabs)/dashboard' : '/(auth)/login'} />;
}
