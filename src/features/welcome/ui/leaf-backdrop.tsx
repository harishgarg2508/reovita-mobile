import { StyleSheet, View } from 'react-native';

/**
 * Decorative corner organic leaf shapes from the Reovita Design System.
 * Floats translucent purple (#7545ED) and volt lime (#D4FF3F) leaf silhouettes
 * in the background for a fresh, modern wellness atmosphere.
 */
export function LeafBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Top-Right Soft Volt Lime Leaf Silhouette */}
      <View style={[styles.leafBase, styles.topRightLime]} />
      <View style={[styles.leafBase, styles.topRightGreen]} />

      {/* Top-Left Soft Purple Petal Accent */}
      <View style={[styles.leafBase, styles.topLeftPurple]} />

      {/* Bottom-Right Organic Sprout Silhouette */}
      <View style={[styles.leafBase, styles.bottomRightLime]} />
      <View style={[styles.leafBase, styles.bottomRightPurple]} />

      {/* Bottom-Left Soft Petal */}
      <View style={[styles.leafBase, styles.bottomLeftLime]} />
    </View>
  );
}

const styles = StyleSheet.create({
  leafBase: {
    position: 'absolute',
    opacity: 0.12,
  },
  topRightLime: {
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderTopLeftRadius: 100,
    borderBottomRightRadius: 100,
    backgroundColor: '#D4FF3F',
    transform: [{ rotate: '45deg' }],
  },
  topRightGreen: {
    top: 20,
    right: -20,
    width: 90,
    height: 90,
    borderTopRightRadius: 70,
    borderBottomLeftRadius: 70,
    backgroundColor: '#7AA800',
    opacity: 0.1,
    transform: [{ rotate: '15deg' }],
  },
  topLeftPurple: {
    top: -20,
    left: -40,
    width: 110,
    height: 110,
    borderTopRightRadius: 80,
    borderBottomLeftRadius: 80,
    backgroundColor: '#7545ED',
    opacity: 0.08,
    transform: [{ rotate: '-30deg' }],
  },
  bottomRightLime: {
    bottom: 20,
    right: -40,
    width: 130,
    height: 130,
    borderTopLeftRadius: 90,
    borderBottomRightRadius: 90,
    backgroundColor: '#D4FF3F',
    transform: [{ rotate: '-15deg' }],
  },
  bottomRightPurple: {
    bottom: -30,
    right: 30,
    width: 100,
    height: 100,
    borderTopRightRadius: 80,
    borderBottomLeftRadius: 80,
    backgroundColor: '#7545ED',
    opacity: 0.09,
    transform: [{ rotate: '35deg' }],
  },
  bottomLeftLime: {
    bottom: -20,
    left: -30,
    width: 110,
    height: 110,
    borderTopLeftRadius: 80,
    borderBottomRightRadius: 80,
    backgroundColor: '#D4FF3F',
    opacity: 0.1,
    transform: [{ rotate: '20deg' }],
  },
});

