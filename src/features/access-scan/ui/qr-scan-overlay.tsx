import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { tapConfirm, USE_NATIVE_DRIVER } from '@shared/lib';

const GRID = 7;
const LOCK_MS = 380;
const HOLD_MS = 260;
const BURST_MS = 760;
const GREEN = '#3DDC84';

// Drawn over the camera while a QR code is searched for.
//   - Searching: four corner brackets that breathe, and a line that sweeps up and down the frame.
//   - Found (locked = true): the brackets tighten and turn green, the frame glows, the rest of the picture dims, and a pattern of
//     squares, like the modules of a QR code, appears inside the frame.
//   - Then the squares fly apart and fade, and onFinished is called. The caller sends the request for access only then, so the user
//     sees the code being taken before anything is asked of the subject.
// When the system asks for reduced motion the code is taken at once, with no animation.
export function QrScanOverlay({ locked, onFinished }: { locked: boolean; onFinished: () => void }) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const frame = Math.max(160, Math.min(box.width, box.height) * 0.66);

  const [sweep] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));
  const [lockNative] = useState(() => new Animated.Value(0));
  const [lockColor] = useState(() => new Animated.Value(0));
  const [burst] = useState(() => new Animated.Value(0));
  const [bursting, setBursting] = useState(false);

  // The squares: a fixed random pattern of modules, and for each one the way it flies off.
  const [modules] = useState(() =>
      Array.from({ length: GRID * GRID }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 70 + Math.random() * 150;
        return {
          row: Math.floor(i / GRID),
          col: i % GRID,
          on: Math.random() > 0.38,
          white: Math.random() > 0.7,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          spin: (Math.random() - 0.5) * 540,
        };
      }),
  );

  // Searching: the sweep and the breathing run until a code is found.
  useEffect(() => {
    if (locked) return;
    const loop = Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(sweep, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(sweep, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(breathe, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
      ),
    ]);
    loop.start();
    return () => loop.stop();
  }, [locked, sweep, breathe]);

  // Found: lock on, hold a moment, scatter, then hand over.
  useEffect(() => {
    if (!locked) return;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduced) => {
        if (cancelled) return;
        if (reduced) {
          onFinished();
          return;
        }
        tapConfirm();
        Animated.parallel([
          Animated.spring(lockNative, { toValue: 1, friction: 6, tension: 140, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(lockColor, { toValue: 1, duration: LOCK_MS, useNativeDriver: false }),
        ]).start();
        setTimeout(() => {
          if (cancelled) return;
          setBursting(true);
          Animated.timing(burst, { toValue: 1, duration: BURST_MS, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start(({ finished }) => {
            if (finished && !cancelled) onFinished();
          });
        }, LOCK_MS + HOLD_MS);
      });
    return () => {
      cancelled = true;
    };
    // The sequence runs once, when a code is found. onFinished is read when it fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const onLayout = (e: LayoutChangeEvent) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });

  const bracketColor = lockColor.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.95)', GREEN] });
  const frameScale = Animated.multiply(
    breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }),
    lockNative.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }),
  );
  const sweepY = sweep.interpolate({ inputRange: [0, 1], outputRange: [10, frame - 12] });
  const cell = (frame * 0.62) / GRID;
  const origin = (frame - cell * GRID) / 2;

  const corner = (position: object, edges: object) => (
    <Animated.View style={[styles.corner, position, edges, { borderColor: bracketColor }]} />
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {/* The picture outside the frame dims once a code is found. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: lockNative.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]} />

      <View style={styles.center}>
        <Animated.View style={{ width: frame, height: frame, transform: [{ scale: frameScale }] }}>
          {/* The glow inside the frame when the code is found */}
          <Animated.View style={[styles.glow, { opacity: lockNative.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]} />

          {corner({ top: 0, left: 0 }, { borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 })}
          {corner({ top: 0, right: 0 }, { borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 })}
          {corner({ bottom: 0, left: 0 }, { borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 })}
          {corner({ bottom: 0, right: 0 }, { borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 })}

          {!locked ? <Animated.View style={[styles.sweep, { transform: [{ translateY: sweepY }] }]} /> : null}

          {/* The squares of the code: they fade in on lock, then scatter. */}
          {locked
            ? modules
                .filter((m) => m.on)
                .map((m, i) => (
                  <Animated.View
                    key={i}
                    style={{
                      position: 'absolute',
                      left: origin + m.col * cell,
                      top: origin + m.row * cell,
                      width: cell * 0.8,
                      height: cell * 0.8,
                      borderRadius: cell * 0.18,
                      backgroundColor: m.white ? '#FFFFFF' : GREEN,
                      opacity: bursting ? burst.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 0.5, 0] }) : lockNative,
                      transform: [
                        { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, m.dx] }) },
                        { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, m.dy] }) },
                        { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${m.spin}deg`] }) },
                        { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) },
                      ],
                    }}
                  />
                ))
            : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  dim: { backgroundColor: 'rgba(0,0,0,0.38)' },
  corner: { position: 'absolute', width: 38, height: 38 },
  glow: { ...StyleSheet.absoluteFill, borderRadius: 16, backgroundColor: 'rgba(61,220,132,0.16)', borderWidth: 1.5, borderColor: 'rgba(61,220,132,0.7)', shadowColor: GREEN, shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  sweep: { position: 'absolute', left: 14, right: 14, height: 3, borderRadius: 2, backgroundColor: GREEN, shadowColor: GREEN, shadowOpacity: 0.95, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, opacity: 0.95 },
});
