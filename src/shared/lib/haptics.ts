import * as Haptics from 'expo-haptics';

// Light tap on confirm actions. Failures (unsupported device) are ignored.
export function tapConfirm(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}
