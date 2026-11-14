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
import { Pressable, Text, View } from 'react-native';

import { AppProviders } from '@app-root/providers/app-providers';
import { AuthGuard } from '@app-root/providers/auth-guard';
import { ThemeBridge } from '@app-root/providers/theme-provider';
import { requestAppPermissions } from '@app-root/bootstrap/request-app-permissions';

SplashScreen.preventAutoHideAsync();

// Shown when a screen throws while rendering (for example a response with a missing field). Only that screen is
// replaced; the app stays running, and "Try again" renders the screen again.
export function ErrorBoundary({ retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F1A2E', textAlign: 'center' }}>This screen could not be shown</Text>
      <Text style={{ fontSize: 14, color: '#5B5470', textAlign: 'center', marginTop: 8 }}>The rest of the app still works.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={{ marginTop: 20, height: 46, paddingHorizontal: 24, borderRadius: 14, backgroundColor: '#1F6F3F', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Try again</Text>
      </Pressable>
    </View>
  );
}

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
