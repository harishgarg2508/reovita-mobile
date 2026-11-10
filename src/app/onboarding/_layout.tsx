import { Stack } from 'expo-router';

import { usePalette } from '@shared/ui/theme';

export default function OnboardingLayout() {
  const p = usePalette();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }} />;
}
