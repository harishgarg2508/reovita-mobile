import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppDrawerContent } from '@app-root/navigation/app-drawer-content';
import { useAppDispatch, useAppSelector } from '@app-root/store';
import { useActiveConsent } from '@entities/consent';
import { useProfileCompleteness } from '@entities/profile';
import { selectIsSignedIn, sessionCleared } from '@entities/session';
import { isApiError } from '@shared/api';
import { AccessRequestPrompt } from '@features/access-approve';

const ACCENT = '#1F6F3F';

// Screens that exist only as pushed detail pages. They stay out of the side menu.
const HIDDEN_FROM_MENU = {
  drawerItemStyle: { display: 'none' as const },
};

// Gatekeeper for every screen under (app): sign-in, then health consent, then onboarding step 1.
// Signed-in screens sit behind a side drawer.
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

  return (
    <>
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#FFFFFF' },
        drawerActiveTintColor: ACCENT,
        drawerLabelStyle: { fontWeight: '600' },
      }}>
      {/* Bottom-dock tabs draw their own chrome. */}
      <Drawer.Screen name="(tabs)" options={{ headerShown: false, drawerLabel: 'Home' }} />
      <Drawer.Screen name="health-score" options={{ drawerLabel: 'Health score' }} />
      {/* The briefing draws its own header with a back button, so the drawer header is hidden here. */}
      <Drawer.Screen name="briefings" options={{ drawerLabel: 'Daily briefings', headerShown: false }} />
      <Drawer.Screen name="medication-interactions" options={{ drawerLabel: 'Medication check' }} />
      <Drawer.Screen name="codename-qr" options={{ drawerLabel: 'My codename & QR' }} />
      <Drawer.Screen name="notifications/index" options={{ drawerLabel: 'Notifications', headerShown: false }} />

      {/* Reports draw their own headers per screen (see reports/_layout). */}
      <Drawer.Screen name="reports" options={{ headerShown: false, ...HIDDEN_FROM_MENU }} />
      <Drawer.Screen name="settings" options={{ headerShown: false, ...HIDDEN_FROM_MENU }} />
      <Drawer.Screen name="measurements" options={{ headerShown: false, ...HIDDEN_FROM_MENU }} />
      <Drawer.Screen name="scan" options={{ headerShown: false, ...HIDDEN_FROM_MENU }} />
      <Drawer.Screen name="medical-history" options={{ headerShown: false, ...HIDDEN_FROM_MENU }} />
      <Drawer.Screen name="biomarkers/[code]" options={HIDDEN_FROM_MENU} />
      <Drawer.Screen name="notifications/[id]" options={HIDDEN_FROM_MENU} />
      <Drawer.Screen name="critical-escalation/[report-id]" options={HIDDEN_FROM_MENU} />
    </Drawer>
    <AccessRequestPrompt />
    </>
  );
}
