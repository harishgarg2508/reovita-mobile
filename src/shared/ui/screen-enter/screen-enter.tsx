import { useEffect, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';

import { USE_NATIVE_DRIVER } from '@shared/lib';

// Gives a screen an opening animation: it slides in from the right a little while it fades in. A phone's stack already animates its screens, but the web build
// does not, so this is used there. It plays once, when the screen is first shown. When the person asks their device for less motion, the screen just appears.
export function ScreenEnter({ children }: PropsWithChildren) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        progress.setValue(1);
        return;
      }
      Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [progress]);

  return (
    <Animated.View style={[styles.fill, { opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
