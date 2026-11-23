import { Stack } from 'expo-router';

import { KeyboardAvoid } from '@shared/ui/keyboard-avoid';
import { usePalette } from '@shared/ui/theme';

export default function OnboardingLayout() {
  const p = usePalette();
  return (
    <KeyboardAvoid>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }} />
    </KeyboardAvoid>
  );
}
