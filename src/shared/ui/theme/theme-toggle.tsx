import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';

import { USE_NATIVE_DRIVER } from '@shared/lib';

import type { ResolvedScheme } from './theme-context';

// Where the press happened on the screen, so the theme change can start from the button.
export interface ToggleOrigin {
  x: number;
  y: number;
}

interface ThemeToggleProps {
  scheme: ResolvedScheme;
  onToggle: (origin?: ToggleOrigin) => void;
}

// Sun in dark mode (tap for light), moon in light mode (tap for dark). On a press the icon spins and pops while the theme
// changes. Icons from @expo/vector-icons.
export function ThemeToggle({ scheme, onToggle }: ThemeToggleProps) {
  const toDark = scheme === 'light';
  const [spin] = useState(() => new Animated.Value(0));

  function press(event: GestureResponderEvent) {
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start();
    const { pageX, pageY } = event.nativeEvent;
    onToggle(Number.isFinite(pageX) && Number.isFinite(pageY) ? { x: pageX, y: pageY } : undefined);
  }

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const pop = spin.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.35, 1] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={toDark ? 'Switch to dark mode' : 'Switch to light mode'}
      onPress={press}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Animated.View style={{ transform: [{ rotate }, { scale: pop }] }}>
        <Ionicons name={toDark ? 'moon' : 'sunny'} size={19} color="#1F6F3F" />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127,127,127,0.12)',
  },
  pressed: { opacity: 0.7 },
});
