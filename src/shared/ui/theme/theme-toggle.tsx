import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import type { ResolvedScheme } from './theme-context';

interface ThemeToggleProps {
  scheme: ResolvedScheme;
  onToggle: () => void;
}

// Sun in dark mode (tap for light), moon in light mode (tap for dark). Icons from @expo/vector-icons.
export function ThemeToggle({ scheme, onToggle }: ThemeToggleProps) {
  const toDark = scheme === 'light';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={toDark ? 'Switch to dark mode' : 'Switch to light mode'}
      onPress={onToggle}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Ionicons name={toDark ? 'moon' : 'sunny'} size={19} color="#1F6F3F" />
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
