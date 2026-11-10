import { Stack } from 'expo-router';

// Reports stack: upload, manual entry, retake, and report detail.
// Screens draw their own headers, so the stack header is hidden.
export default function ReportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}>
      <Stack.Screen name="retake" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="interpretation/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
