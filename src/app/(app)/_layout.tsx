import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAppDispatch, useAppSelector } from '@app-root/store';
import { useActiveConsent } from '@entities/consent';
import { useProfileCompleteness } from '@entities/profile';
import { selectIsSignedIn, sessionCleared } from '@entities/session';
import { isApiError } from '@shared/api';
import { ScreenBackButton } from '@shared/ui';

// Gatekeeper for every screen under (app): sign-in, then health consent, then onboarding step 1.
export default function AppLayout() {
  const dispatch = useAppDispatch();
  const signedIn = useAppSelector(selectIsSignedIn);
  const consent = useActiveConsent('health_data');
  const status = useProfileCompleteness();
  const unauthorized =
    isApiError(consent.error, 'unauthorized') || isApiError(status.error, 'unauthorized');

  useEffect(() => {
    if (unauthorized && signedIn) {
      dispatch(sessionCleared());
    }
  }, [dispatch, signedIn, unauthorized]);

  if (unauthorized && !signedIn) {
    return <Redirect href="/(auth)/login" />;
  }
  if (unauthorized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (consent.isLoading || status.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!consent.granted) {
    return <Redirect href="/(auth)/consent" />;
  }
  if (!status.data?.dashboard_access) {
    return <Redirect href="/onboarding/step-1" />;
  }
  // Pushed screens get a back arrow in the header. Falls back to the dashboard when there is no history.
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerLeft: () => <ScreenBackButton fallback="/(app)/(tabs)/dashboard" />,
      }}>
      {/* Tabs draw their own chrome. Reports draw their own headers per screen (see reports/_layout). */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="reports" options={{ headerShown: false }} />
      <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
    </Stack>
  );
}
