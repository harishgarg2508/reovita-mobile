import { Image, StyleSheet, View } from 'react-native';

/**
 * Centered miniature dual-leaf sprout emblem for the login screen divider.
 * Left leaf: Royal Purple (#7545ED)
 * Right leaf: Volt Lime (#84CC16)
 */
export function MiniSproutDivider({ size = 26 }: { size?: number }) {
  const height = (size * 20) / 28;
  return (
    <View style={[styles.container, { width: size, height }]}>
      <Image
        source={require('../../assets/images/reovita-sprout.png')}
        accessibilityIgnoresInvertColors
        style={{ width: size, height }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
