import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { Brand, Radius, Type } from '../theme/tokens';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  // While the action runs: shows a spinner in place of the label and blocks a second tap.
  loading?: boolean;
}

// One button style per variant. Pressed state scales slightly so taps feel responsive.
export function Button({ label, variant = 'primary', disabled, loading = false, style, ...rest }: ButtonProps) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: off }}
      disabled={off}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        off && styles.disabled,
        pressed && !off && styles.pressed,
        typeof style === 'function' ? undefined : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : Brand.ink} />
      ) : (
        <Text style={[styles.label, variant === 'primary' ? styles.labelOnPrimary : styles.labelDark]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: Brand.primary },
  secondary: { backgroundColor: '#F0F0F3' },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  label: { ...Type.heading },
  labelOnPrimary: { color: '#FFFFFF' },
  labelDark: { color: Brand.ink },
});
