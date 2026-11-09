import { Stack } from 'expo-router';

import { ScreenBackButton } from '@shared/ui';

// Reports stack: upload, manual entry, retake, and report detail.
// Upload and manual entry get the shared header with a back arrow. Retake, review and interpretation
// draw their own header with a back arrow, so the stack header is hidden for them.
export default function ReportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#FFFFFF' },
        contentStyle: { backgroundColor: '#FFFFFF' },
        headerLeft: () => <ScreenBackButton fallback="/(app)/(tabs)/dashboard" />,
      }}>
      <Stack.Screen name="retake" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="interpretation/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
