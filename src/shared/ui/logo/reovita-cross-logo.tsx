import { StyleSheet, View } from 'react-native';

interface ReovitaCrossLogoProps {
  /** Size of the logo square (default: 44). */
  size?: number;
}

/**
 * Reovita Brand Medical Cross Emblem.
 * Recreates the two-tone medical plus from the welcome design using Reovita's
 * signature Royal Violet (#7545ED) and Volt Lime (#D4FF3F / #7AA800).
 */
export function ReovitaCrossLogo({ size = 44 }: ReovitaCrossLogoProps) {
  const scale = size / 44;
  const barThickness = 14 * scale;
  const barLength = 40 * scale;
  const radius = barThickness / 2;
  const centerOffset = (barLength - barThickness) / 2;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Reovita Logo"
      style={[styles.container, { width: barLength, height: barLength }]}>
      {/* Horizontal pill - Royal Violet on left, Volt Lime on right */}
      <View
        style={[
          styles.bar,
          {
            width: barLength,
            height: barThickness,
            top: centerOffset,
            left: 0,
            borderRadius: radius,
            backgroundColor: '#7545ED',
          },
        ]}>
        <View
          style={[
            styles.halfRight,
            {
              width: barLength / 2,
              height: barThickness,
              borderTopRightRadius: radius,
              borderBottomRightRadius: radius,
              backgroundColor: '#D4FF3F',
            },
          ]}
        />
      </View>

      {/* Vertical pill - Royal Violet on top, Emerald Green on bottom */}
      <View
        pointerEvents="none"
        style={[
          styles.bar,
          {
            width: barThickness,
            height: barLength,
            top: 0,
            left: centerOffset,
            borderRadius: radius,
            backgroundColor: '#7545ED',
          },
        ]}>
        <View
          style={[
            styles.halfBottom,
            {
              width: barThickness,
              height: barLength / 2,
              borderBottomLeftRadius: radius,
              borderBottomRightRadius: radius,
              backgroundColor: '#7AA800',
            },
          ]}
        />
      </View>

      {/* Center intersection blend square */}
      <View
        pointerEvents="none"
        style={[
          styles.centerJoint,
          {
            width: barThickness,
            height: barThickness,
            top: centerOffset,
            left: centerOffset,
            backgroundColor: '#7545ED',
            opacity: 0.15,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    overflow: 'hidden',
  },
  halfRight: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  halfBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  centerJoint: {
    position: 'absolute',
  },
});

