import { StyleSheet, View, type ViewStyle } from 'react-native';

// Placeholder block shown while a job (OCR, analysis) or query is loading.
export function Skeleton({ height = 16, style }: { height?: number; style?: ViewStyle }) {
  return <View accessibilityLabel="Loading" style={[styles.block, { height }, style]} />;
}

const styles = StyleSheet.create({
  block: { width: '100%', borderRadius: 8, backgroundColor: '#E0E1E6' },
});
