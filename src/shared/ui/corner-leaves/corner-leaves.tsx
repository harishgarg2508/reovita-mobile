import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

const TOP_RIGHT_LEAVES_SVG = `<svg viewBox="0 0 240 260" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Top corner accent leaf -->
  <path
    d="M170,-10 C190,30 215,55 240,65 L240,-10 Z"
    fill="#84CC16"
    fill-opacity="0.12"
  />
  <!-- Main Left Leaf Petal: exact organic curve from Figma -->
  <path
    d="M140,-10 C80,45 50,100 70,160 C105,125 145,65 175,-10 Z"
    fill="#84CC16"
    fill-opacity="0.16"
  />
  <!-- Lower Right Leaf Petal: overlapping translucent leaf -->
  <path
    d="M240,40 C170,85 110,150 125,225 C165,190 215,150 240,100 Z"
    fill="#A3E635"
    fill-opacity="0.22"
  />
</svg>`;

const BOTTOM_RIGHT_LEAVES_SVG = `<svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Bottom-right translucent botanical leaf silhouette -->
  <path
    d="M220,120 C160,110 100,140 80,200 L220,200 Z"
    fill="#84CC16"
    fill-opacity="0.14"
  />
  <path
    d="M220,60 C175,70 120,115 130,175 C165,150 200,125 220,100 Z"
    fill="#A3E635"
    fill-opacity="0.18"
  />
</svg>`;

const TOP_RIGHT_URI = `data:image/svg+xml;utf8,${encodeURIComponent(TOP_RIGHT_LEAVES_SVG)}`;
const BOTTOM_RIGHT_URI = `data:image/svg+xml;utf8,${encodeURIComponent(BOTTOM_RIGHT_LEAVES_SVG)}`;

/**
 * Top-Right Botanical Leaf Petals.
 * Exact recreation of the organic translucent green leaf silhouettes shown in
 * the Figma login and splash screen designs.
 */
export function TopRightLeaves({ size = 240 }: { size?: number }) {
  return (
    <View pointerEvents="none" style={[styles.topRight, { width: size, height: (size * 260) / 240 }]}>
      <Image
        source={{ uri: TOP_RIGHT_URI }}
        style={styles.image}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    </View>
  );
}

/**
 * Bottom-Right Botanical Leaf Petals.
 * Translucent organic green leaf accent at the bottom-right corner.
 */
export function BottomRightLeaves({ size = 200 }: { size?: number }) {
  return (
    <View pointerEvents="none" style={[styles.bottomRight, { width: size, height: (size * 200) / 220 }]}>
      <Image
        source={{ uri: BOTTOM_RIGHT_URI }}
        style={styles.image}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 0,
  },
  bottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

