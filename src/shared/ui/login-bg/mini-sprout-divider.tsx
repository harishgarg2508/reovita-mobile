import { StyleSheet, View } from 'react-native';
import { ReovitaLeafLogo } from '../logo';

/**
 * Centered miniature dual-leaf sprout emblem for the login screen divider.
 * Left leaf: Royal Purple (#7545ED)
 * Right leaf: Volt Lime (#84CC16)
 */
export function MiniSproutDivider({ size = 26 }: { size?: number }) {
  const height = (size * 20) / 28;
  return (
    <View style={[styles.container, { width: size, height }]}>
      <ReovitaLeafLogo
        size={32}
        wordmarkSize={32}
        wordmarkColor="#171717"
        showWordmark={false}
        showTagline={false}
        layout="horizontal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

