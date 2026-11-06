import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

/**
 * Animated Progress Bar.
 * Smoothly interpolates the width between percentage updates.
 * Matches the Figma design with #84CC16 lime-green fill.
 */
export function ProgressBar({
  percent,
  color = '#84CC16',
  trackColor = '#ECEAF0',
  height = 7,
}: {
  percent: number;
  color?: string;
  trackColor?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const [anim] = useState(() => new Animated.Value(clamped));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: trackColor, height, borderRadius: height / 2 },
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: clamped, min: 0, max: 100 }}>
      <Animated.View
        style={[
          styles.fill,
          {
            width,
            backgroundColor: color,
            height,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
