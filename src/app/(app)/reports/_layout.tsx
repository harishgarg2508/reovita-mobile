import { Stack } from 'expo-router';

import { usePalette } from '@shared/ui/theme';

// Reports stack: upload, manual entry, retake, and report detail.
// Screens draw their own headers, so the stack header is hidden.
export default function ReportsLayout() {
  const p = usePalette();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: p.bg },
      }}>
      <Stack.Screen name="retake" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="interpretation/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="audit/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
