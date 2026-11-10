import { svgDataUri } from '@shared/lib';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

const SVG_BOTTOM_MIST = `<svg viewBox="0 0 400 210" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <defs>
    <linearGradient id="mistGradBack" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EFE6FD" stop-opacity="0.88" />
      <stop offset="70%" stop-color="#F5F0FF" stop-opacity="0.75" />
      <stop offset="100%" stop-color="#FAF8FF" stop-opacity="0.60" />
    </linearGradient>
    <linearGradient id="mistGradFront" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#DEC8FA" stop-opacity="0.82" />
      <stop offset="60%" stop-color="#EBDEFD" stop-opacity="0.70" />
      <stop offset="100%" stop-color="#F7F2FF" stop-opacity="0.50" />
    </linearGradient>
    <linearGradient id="mistGradCorner" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D2B8F8" stop-opacity="0.70" />
      <stop offset="100%" stop-color="#E6D6FC" stop-opacity="0.45" />
    </linearGradient>
  </defs>

  <!-- Back Wave: Sweeps gently from upper-left (y=42) down across to bottom-right (y=168) -->
  <path
    d="M0,42 C95,42 195,115 400,168 L400,210 L0,210 Z"
    fill="url(#mistGradBack)"
  />

  <!-- Middle Wave: Starts at y=98 on the left edge, curving across through (350, 182) -->
  <path
    d="M0,98 C90,98 185,145 350,182 L400,192 L400,210 L0,210 Z"
    fill="url(#mistGradFront)"
  />

  <!-- Front Accent Wave at bottom-left corner -->
  <path
    d="M0,142 C55,142 110,170 168,210 L0,210 Z"
    fill="url(#mistGradCorner)"
  />
</svg>`;

const DATA_URI = svgDataUri(SVG_BOTTOM_MIST);

/**
 * Exact vector organic lavender mist curves for the bottom of the login screen.
 * Recreated precisely from the Reovita Figma SSO login design using pure SVG.
 */
export function LoginBgBottomMist({ height = 210 }: { height?: number }) {
  return (
    <View pointerEvents="none" style={[styles.container, { height }]}>
      <Image
        source={{ uri: DATA_URI }}
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
