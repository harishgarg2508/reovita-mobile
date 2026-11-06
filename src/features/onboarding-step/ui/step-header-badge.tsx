import { Image as ExpoImage } from 'expo-image';
import { StyleSheet, View } from 'react-native';

const STEP_1_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill="%23F4FBF0"/><circle cx="50" cy="50" r="40" fill="%23EAF6E5"/><path d="M50 82 C50 82 20 62 16 42 C12 22 28 14 38 22 C45 28 50 36 50 36 C50 36 55 28 62 22 C72 14 88 22 84 42 C80 62 50 82 50 82 Z" fill="%237545ED"/><path d="M26 48 L40 48 L45 36 L52 60 L58 44 L63 50 L74 50" fill="none" stroke="%23FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M68 64 C68 64 88 56 90 74 C90 82 82 86 76 84 C68 82 66 72 68 64 Z" fill="%2384CC16"/><path d="M72 78 C76 74 82 70 86 68" fill="none" stroke="%2365A30D" stroke-width="1.8" stroke-linecap="round"/></svg>`;

const STEP_2_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill="%23F4FBF0"/><circle cx="50" cy="50" r="40" fill="%23EAF6E5"/><path d="M50 18 L76 28 C76 56 64 74 50 84 C36 74 24 56 24 28 Z" fill="%237545ED"/><path d="M44 36 H56 V45 H65 V57 H56 V66 H44 V57 H35 V45 H44 Z" fill="%23FFFFFF"/><path d="M68 64 C68 64 88 56 90 74 C90 82 82 86 76 84 C68 82 66 72 68 64 Z" fill="%2384CC16"/><path d="M72 78 C76 74 82 70 86 68" fill="none" stroke="%2365A30D" stroke-width="1.8" stroke-linecap="round"/></svg>`;

const STEP_3_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill="%23F4FBF0"/><circle cx="50" cy="50" r="40" fill="%23EAF6E5"/><path d="M50 22 C55 36 68 42 68 56 C68 70 58 78 50 82 C42 78 32 70 32 56 C32 42 45 36 50 22 Z" fill="%237545ED"/><path d="M50 40 L53 48 L61 51 L53 54 L50 62 L47 54 L39 51 L47 48 Z" fill="%23FFFFFF"/><path d="M68 64 C68 64 88 56 90 74 C90 82 82 86 76 84 C68 82 66 72 68 64 Z" fill="%2384CC16"/><path d="M72 78 C76 74 82 70 86 68" fill="none" stroke="%2365A30D" stroke-width="1.8" stroke-linecap="round"/></svg>`;

const STEP_4_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill="%23F4FBF0"/><circle cx="50" cy="50" r="40" fill="%23EAF6E5"/><rect x="28" y="20" width="44" height="60" rx="10" fill="%237545ED"/><rect x="36" y="32" width="28" height="4" rx="2" fill="%23FFFFFF"/><rect x="36" y="42" width="20" height="4" rx="2" fill="%23FFFFFF"/><path d="M48 54 L50 60 L56 62 L50 64 L48 70 L46 64 L40 62 L46 60 Z" fill="%23FFFFFF"/><path d="M68 64 C68 64 88 56 90 74 C90 82 82 86 76 84 C68 82 66 72 68 64 Z" fill="%2384CC16"/><path d="M72 78 C76 74 82 70 86 68" fill="none" stroke="%2365A30D" stroke-width="1.8" stroke-linecap="round"/></svg>`;

const BADGE_MAP: Record<number, string> = {
  1: STEP_1_SVG,
  2: STEP_2_SVG,
  3: STEP_3_SVG,
  4: STEP_4_SVG,
};

export function StepHeaderBadge({ step, size = 80 }: { step: number; size?: number }) {
  const uri = BADGE_MAP[step] ?? STEP_1_SVG;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <ExpoImage
        source={{ uri }}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityLabel={`Step ${step} emblem`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

