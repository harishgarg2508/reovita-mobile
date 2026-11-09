import { USE_NATIVE_DRIVER } from '@shared/lib';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// Dots that drift outward from the check, at these angles (degrees) and colors.
const DOTS = [
  { angle: -60, color: '#D4FF3F' },
  { angle: -15, color: '#7545ED' },
  { angle: 30, color: '#D4A64A' },
  { angle: 110, color: '#84CC16' },
  { angle: 160, color: '#7545ED' },
  { angle: 210, color: '#E34255' },
];

// Animated success mark: a green check in a pulsing lime halo, with confetti dots drifting outward.
export function CelebrationCheck({ size = 76 }: { size?: number }) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: USE_NATIVE_DRIVER }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const reach = size * 0.82;
  const box = size * 1.9;
  // The tick itself breathes continuously, in step with the halo.
  const coreScale = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.07, 1] });

  return (
    <View style={[styles.wrap, { width: box, height: box }]}>
      <Animated.View
        style={[
          styles.halo,
          { width: size * 1.3, height: size * 1.3, borderRadius: size, opacity: haloOpacity, transform: [{ scale: haloScale }] },
        ]}
      />
      <Animated.View
        style={[styles.core, { width: size, height: size, borderRadius: size / 2, transform: [{ scale: coreScale }] }]}>
        <Ionicons name="checkmark" size={size * 0.56} color="#FFFFFF" />
      </Animated.View>
      {DOTS.map((dot) => {
        const rad = (dot.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * reach;
        const dy = Math.sin(rad) * reach;
        return (
          <Animated.View
            key={dot.angle}
            style={[
              styles.dot,
              {
                backgroundColor: dot.color,
                opacity: pulse.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] }),
                transform: [
                  { translateX: pulse.interpolate({ inputRange: [0, 1], outputRange: [dx * 0.55, dx] }) },
                  { translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [dy * 0.55, dy] }) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', backgroundColor: '#D4FF3F' },
  core: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#84CC16' },
  dot: { position: 'absolute', width: 7, height: 7, borderRadius: 4 },
});
