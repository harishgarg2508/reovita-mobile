import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Brand, Elevation, Radius } from '../theme/tokens';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

// Standard surface for grouped content. Use instead of ad-hoc boxes.
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={[styles.card, style]}>{children}</View>;
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.line,
    padding: 18,
    gap: 12,
    ...Elevation.card,
  },
});
