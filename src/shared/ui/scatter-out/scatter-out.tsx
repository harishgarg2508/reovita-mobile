import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { USE_NATIVE_DRIVER } from '@shared/lib';

const DOTS = 12;
const DURATION_MS = 440;

// Removes what is inside it with a scatter: the content fades and shrinks while small dots fly outward from its middle, then `onDone` runs (that is
// when the delete is sent). When the person asks their device for less motion, `onDone` runs at once with no animation.
export function ScatterOut({ active, onDone, color = '#9CA3AF', children }: PropsWithChildren<{ active: boolean; onDone: () => void; color?: string }>) {
  const [progress] = useState(() => new Animated.Value(0));
  const finished = useRef(false);
  // A fixed set of directions and distances, so every removal looks alike and does not change while it plays.
  const dots = useMemo(
    () =>
      Array.from({ length: DOTS }, (_, i) => {
        const angle = (i / DOTS) * Math.PI * 2 + (i % 3) * 0.2;
        const distance = 70 + (i % 4) * 18;
        return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, size: 4 + (i % 3) * 2 };
      }),
    [],
  );

  useEffect(() => {
    if (!active || finished.current) return;
    finished.current = true;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        onDone();
        return;
      }
      Animated.timing(progress, { toValue: 1, duration: DURATION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start(() => onDone());
    });
    return () => {
      cancelled = true;
    };
  }, [active, onDone, progress]);

  const contentOpacity = progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.3, 0] });
  const contentScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ opacity: contentOpacity, transform: [{ scale: contentScale }] }}>{children}</Animated.View>
      {active ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {dots.map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  width: dot.size,
                  height: dot.size,
                  borderRadius: dot.size / 2,
                  backgroundColor: color,
                  opacity: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dot.x] }) },
                    { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dot.y] }) },
                  ],
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  dot: { position: 'absolute', left: '50%', top: '50%', marginLeft: -4, marginTop: -4 },
});
