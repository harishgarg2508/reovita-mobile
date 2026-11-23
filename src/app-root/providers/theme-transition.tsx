import { useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

import { USE_NATIVE_DRIVER } from '@shared/lib';
import { PALETTES } from '@shared/ui/theme';
import type { ResolvedScheme } from '@shared/ui/theme/theme-context';

export interface ThemeOrigin {
  x: number;
  y: number;
}

type Play = (next: ResolvedScheme, origin: ThemeOrigin | undefined, apply: () => void) => void;

// On the web the change of theme is a circle that grows from the button (the browser's View Transitions API, see theme-transition.web.ts). A phone has no such
// API, so the ThemeTransitionOverlay below draws a soft wave from the button over the new theme; this file only tells it to start.
type Listener = (next: ResolvedScheme, origin: ThemeOrigin | undefined, apply: () => void) => void;
let listener: Listener | null = null;

const play: Play = (next, origin, apply) => {
  if (listener) listener(next, origin, apply);
  else apply();
};

export function useThemeTransition(): Play {
  return play;
}

const GROW_MS = 560;
const FADE_MS = 460;

// Mounted once, above everything (see AppProviders). It draws nothing until a change of theme starts.
//
// The new theme is applied at once, so the screen is never blank. Over it, a veil in the old theme's colour thins out and a soft circle in the new
// theme's colour spreads from the button, so the change reads as a wave moving across the screen instead of a flat black or white flash.
export function ThemeTransitionOverlay() {
  const [run, setRun] = useState<{ oldColor: string; newColor: string; x: number; y: number; radius: number } | null>(null);
  const [grow] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    listener = (next, origin, apply) => {
      const { width, height } = Dimensions.get('window');
      const x = origin?.x ?? width - 40;
      const y = origin?.y ?? 60;
      // The circle must reach the farthest corner of the screen from where it starts.
      const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
      grow.setValue(0);
      fade.setValue(0);
      apply();
      setRun({ oldColor: PALETTES[next === 'dark' ? 'light' : 'dark'].bg, newColor: PALETTES[next].bg, x, y, radius });
    };
    return () => {
      listener = null;
    };
  }, [grow, fade]);

  useEffect(() => {
    if (!run) return;
    Animated.parallel([
      Animated.timing(grow, { toValue: 1, duration: GROW_MS, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(fade, { toValue: 1, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start(() => setRun(null));
  }, [run, grow, fade]);

  if (!run) return null;
  const size = run.radius * 2;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: run.oldColor, opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }) }]}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: run.x - run.radius,
          top: run.y - run.radius,
          width: size,
          height: size,
          borderRadius: run.radius,
          backgroundColor: run.newColor,
          opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
          transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.02, 1] }) }],
        }}
      />
    </View>
  );
}
