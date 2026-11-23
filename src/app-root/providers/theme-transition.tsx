import { useEffect, useRef, useState } from 'react';
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
// API, so it draws the same thing itself: a circle in the new theme's colour grows from the button until it covers the screen, the theme is switched under
// it, and it fades away. It is the ThemeTransitionOverlay below that draws it; this file only tells it to start.
type Listener = (next: ResolvedScheme, origin: ThemeOrigin | undefined, apply: () => void) => void;
let listener: Listener | null = null;

const play: Play = (next, origin, apply) => {
  if (listener) listener(next, origin, apply);
  else apply();
};

export function useThemeTransition(): Play {
  return play;
}

const GROW_MS = 520;
const FADE_MS = 320;

// Mounted once, above everything (see AppProviders). It draws nothing until a change of theme starts.
export function ThemeTransitionOverlay() {
  const [run, setRun] = useState<{ color: string; x: number; y: number; radius: number } | null>(null);
  const [grow] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const pending = useRef<(() => void) | null>(null);

  useEffect(() => {
    listener = (next, origin, apply) => {
      const { width, height } = Dimensions.get('window');
      const x = origin?.x ?? width - 40;
      const y = origin?.y ?? 60;
      // The circle must reach the farthest corner of the screen from where it starts.
      const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
      grow.setValue(0);
      fade.setValue(1);
      pending.current = apply;
      setRun({ color: PALETTES[next].bg, x, y, radius });
    };
    return () => {
      listener = null;
    };
  }, [grow, fade]);

  useEffect(() => {
    if (!run) return;
    Animated.timing(grow, { toValue: 1, duration: GROW_MS, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start(() => {
      // The screen is covered: the theme is switched under the circle, and the circle fades to show it.
      pending.current?.();
      pending.current = null;
      Animated.timing(fade, { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }).start(() => setRun(null));
    });
  }, [run, grow, fade]);

  if (!run) return null;
  const size = run.radius * 2;
  return (
    <View pointerEvents="auto" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: run.x - run.radius,
          top: run.y - run.radius,
          width: size,
          height: size,
          borderRadius: run.radius,
          backgroundColor: run.color,
          opacity: fade,
          transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.02, 1] }) }],
        }}
      />
    </View>
  );
}
