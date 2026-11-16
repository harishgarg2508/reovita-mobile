import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

// Placeholder block shown while a job (OCR, analysis) or query is loading.
export function Skeleton({ height = 16, style }: { height?: number; style?: ViewStyle }) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View accessibilityLabel="Loading" style={[styles.block, { height }, style]} />;
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  block: { width: '100%', borderRadius: 8, backgroundColor: colors.border },
});
