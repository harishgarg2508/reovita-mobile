import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

const SVG_MIST = `<svg viewBox="0 0 400 190" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <!-- Top/Back Wave: Sweeps gently from upper-left (y=38) across to bottom-right (y=152) -->
  <path
    d="M0,38 C100,38 210,110 400,152 L400,190 L0,190 Z"
    fill="#EDE5FD"
    fill-opacity="0.72"
  />
  <!-- Middle Wave: Layered slope from y=85, tapering smoothly toward the right -->
  <path
    d="M0,85 C95,85 195,135 360,170 L400,176 L400,190 L0,190 Z"
    fill="#DDD0FA"
    fill-opacity="0.65"
  />
  <!-- Front Corner Curve: Subtle mound at the bottom-left -->
  <path
    d="M0,126 C60,126 120,154 180,190 L0,190 Z"
    fill="#CEBAF7"
    fill-opacity="0.55"
  />
</svg>`;

const SVG_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(SVG_MIST)}`;

/**
 * Reovita Signature Bottom Wave Mist.
 * Exact recreation of the organic lavender mist wave that stretches across the
 * bottom of the screen in the Reovita Design System.
 */
export function BottomWaveMist({ height = 180 }: { height?: number }) {
  return (
    <View pointerEvents="none" style={[styles.container, { height }]}>
      <Image
        source={{ uri: SVG_DATA_URI }}
        style={styles.image}
        contentFit="fill"
        cachePolicy="memory-disk"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 0,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

