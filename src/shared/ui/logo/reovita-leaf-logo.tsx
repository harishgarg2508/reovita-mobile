import { Image, StyleSheet, Text, TextStyle, View } from 'react-native';

import { Font } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';

// On native, weight is chosen by font family (Poppins ships one file per weight),
// so a fontWeight override must also switch the family.
const WORDMARK_FONT_BY_WEIGHT: Record<string, string> = {
  '400': Font.regular,
  normal: Font.regular,
  '500': Font.medium,
  '600': Font.semibold,
  '700': Font.bold,
  bold: Font.bold,
  '800': Font.extrabold,
};

interface ReovitaLeafLogoProps {
  /** Size of the leaf emblem icon (default: 56). */
  size?: number;
  /** Custom wordmark font size if needed. */
  wordmarkSize?: number;
  /** Overrides the wordmark colour. Defaults to the theme text colour. */
  wordmarkColor?: string;
  /** Whether to render the 'Reovita' wordmark. */
  showWordmark?: boolean;
  /** Whether to render the 'Your Health, Our DNA' tagline. */
  showTagline?: boolean;
  /** 'vertical' (centered stack) or 'horizontal' (row for headers). */
  layout?: 'vertical' | 'horizontal';
  fontWeight?: TextStyle['fontWeight'];
}

/**
 * Official Reovita Leaf Sprout Logo Emblem.
 * Recreates the two-leaf organic DNA sprout from the Reovita Design System:
 * - Left Leaf: Royal Purple (#7545ED)
 * - Right Leaf: Volt Lime (#D4FF3F) with Emerald stem accent (#7AA800)
 */
export function ReovitaLeafLogo({
  size = 56,
  wordmarkSize,
  wordmarkColor,
  showWordmark = true,
  showTagline = true,
  layout = 'vertical',
  fontWeight
}: ReovitaLeafLogoProps) {
  const theme = useTheme();

  // Scale dimensions proportionally
  const scale = size / 56;

  const isRow = layout === 'horizontal';

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Reovita - Your Health, Our DNA"
      style={[styles.container, isRow ? styles.rowContainer : styles.colContainer]}>
      {/* Brand emblem: the official Reovita logo from shared/assets */}
      <Image
        source={require('../../assets/images/reovita-sprout.png')}
        accessibilityIgnoresInvertColors
        style={{ width: size, height: size * 0.95 }}
        resizeMode="contain"
      />

      {/* Wordmark and Tagline */}
      {(showWordmark || showTagline) && (
        <View style={[styles.textGroup, isRow && styles.textGroupRow]}>
          {showWordmark && (
            <Text
              style={[
                styles.wordmark,
                {
                  fontSize: wordmarkSize ?? (isRow ? 22 : 32 * scale),
                  lineHeight: (wordmarkSize ?? (isRow ? 22 : 32 * scale)) * 1.18,
                  color: wordmarkColor ?? theme.text,
                  ...(fontWeight !== undefined
                    ? { fontWeight, fontFamily: WORDMARK_FONT_BY_WEIGHT[String(fontWeight)] ?? Font.bold }
                    : {}),
                },
              ]}>
              Reovita
            </Text>
          )}
          {showTagline && (
            <Text
              style={[
                styles.tagline,
                {
                  fontSize: isRow ? 12 : 14 * scale,
                  color: theme.textSecondary,
                },
              ]}>
              Your Health, Our DNA
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  emblemWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafLeft: {
    position: 'absolute',
    transform: [{ rotate: '-22deg' }],
  },
  leafRight: {
    position: 'absolute',
    transform: [{ rotate: '24deg' }],
  },
  leafAccent: {
    position: 'absolute',
    transform: [{ rotate: '12deg' }],
    opacity: 0.9,
  },
  textGroup: {
    alignItems: 'center',
  },
  textGroupRow: {
    alignItems: 'flex-start',
  },
  wordmark: {
    fontFamily: Font.bold,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  tagline: {
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
});
