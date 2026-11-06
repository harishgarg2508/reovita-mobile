import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  // White behind every onboarding screen, so the dark theme never shows through.
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />;
}
