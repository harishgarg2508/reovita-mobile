import { Redirect } from 'expo-router';
import { useCallback, useState } from 'react';

import { selectIsSignedIn, selectSessionStatus } from '@entities/session';
import { useAppSelector } from '@app-root/store';
import { SplashScreen } from '@features/splash';
import { View } from 'react-native';

// Landing route: shows the splash, then goes to the dashboard (signed in) or login.
export default function LandingRoute() {
  const signedIn = useAppSelector(selectIsSignedIn);
  const sessionStatus = useAppSelector(selectSessionStatus);
  const [splashDone, setSplashDone] = useState(false);
  const onDone = useCallback(() => setSplashDone(true), []);

  if (!splashDone) return <SplashScreen onDone={onDone} />;
  // Wait for the session check before choosing where to go.
  if (sessionStatus === 'loading') return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  return <Redirect href={signedIn ? '/(app)/(tabs)/dashboard' : '/(auth)/login'} />;
}
