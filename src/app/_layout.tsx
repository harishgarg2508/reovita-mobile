import '@app-root/styles/global.css';

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { AppProviders } from '@app-root/providers/app-providers';
import { ThemeBridge } from '@app-root/providers/theme-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  // Never block the app for long: after 3 seconds, show it with the system font instead.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const ready = fontsLoaded || fontError || timedOut;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  // Keep the splash up until the brand font is ready, so no text flashes in a fallback face.
  if (!ready) return null;

  return (
    <AppProviders>
      <ThemeBridge>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeBridge>
    </AppProviders>
  );
}
