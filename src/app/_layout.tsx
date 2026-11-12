import '@app-root/styles/global.css';

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

import { usePalette } from '@shared/ui/theme';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { AppProviders } from '@app-root/providers/app-providers';
import { AuthGuard } from '@app-root/providers/auth-guard';
import { ThemeBridge } from '@app-root/providers/theme-provider';
import { requestAppPermissions } from '@app-root/bootstrap/request-app-permissions';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Icon fonts load on first use. Preload them here and ignore failures, so a slow icon font
  // cannot surface as an uncaught error and break the page.
  useEffect(() => {
    if (typeof Ionicons.loadFont === 'function') {
      Ionicons.loadFont().catch(() => undefined);
    }
  }, []);

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

  // Camera and location prompts appear once the app is up.
  useEffect(() => {
    if (ready) void requestAppPermissions();
  }, [ready]);

  // Keep the splash up until the brand font is ready, so no text flashes in a fallback face.
  if (!ready) return null;

  return (
    <AppProviders>
      <ThemeBridge>
        <AuthGuard>
          <ThemedStack />
        </AuthGuard>
      </ThemeBridge>
    </AppProviders>
  );
}

// The root stack takes its background from the theme, so every screen without its own background follows the toggle.
function ThemedStack() {
  const p = usePalette();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }} />;
}
