import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Brand, Elevation, Radius } from '../theme/tokens';

// Standard surface for grouped content. Use instead of ad-hoc boxes.
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.line,
    padding: 18,
    gap: 10,
    ...Elevation.card,
  },
});
