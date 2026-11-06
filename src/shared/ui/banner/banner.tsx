import { StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, StatusColors, Type } from '../theme/tokens';

interface BannerProps {
  tone: 'critical' | 'amber';
  message: string;
  children?: React.ReactNode;
}

// Soft alert card with a coloured left accent, matching the design: critical is red, amber is gold.
export function Banner({ tone, message, children }: BannerProps) {
  const critical = tone === 'critical';
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.box,
        critical
          ? { backgroundColor: StatusColors.criticalSoft, borderLeftColor: StatusColors.criticalBanner }
          : { backgroundColor: StatusColors.amberSoft, borderLeftColor: StatusColors.watch },
      ]}>
      <Text style={[Type.body, styles.text]}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 16, borderRadius: Radius.lg, borderLeftWidth: 4, gap: 12 },
  text: { color: Brand.ink },
});
