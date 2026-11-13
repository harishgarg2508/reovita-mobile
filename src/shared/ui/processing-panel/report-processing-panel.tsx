import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { USE_NATIVE_DRIVER } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';

const GREEN = '#1F6F3F';

// Shown while the report is still being read. The event stream tells the screen when the observations are ready.
export function ReportProcessingPanel({ onLater }: { onLater: () => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  // The clock on the badge turns continuously while the report is read.
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: USE_NATIVE_DRIVER }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  // A scan line sweeps down the document, again and again, while the report is read.
  const [scan] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scan, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE_DRIVER }),
    );
    loop.start();
    return () => loop.stop();
  }, [scan]);
  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [-44, 44] });
  const scanOpacity = scan.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] });

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
        <View style={[styles.iconCircle, { backgroundColor: p.accentSoft }]}>
          <View style={styles.docClip}>
            <Ionicons name="document-text-outline" size={64} color={GREEN} />
            <Animated.View
              style={[styles.scanLine, { opacity: scanOpacity, transform: [{ translateY: scanY }] }]}
            />
          </View>
          <Animated.View style={[styles.clockBadge, { backgroundColor: p.card, transform: [{ rotate }] }]}>
            <Ionicons name="time-outline" size={22} color={GREEN} />
          </Animated.View>
        </View>
        <Text style={[styles.title, { color: p.text }]}>Your report is</Text>
        <Text style={[styles.title, { color: GREEN }]}>being read</Text>
        <Text style={[styles.body, { color: p.muted }]}>
          This usually takes a minute or two. You can leave this screen. We will notify you when your observations are ready.
        </Text>
        <Pressable accessibilityRole="button" onPress={onLater} style={styles.button}>
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>Come back later</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  card: { width: '100%', borderRadius: 24, borderWidth: 1, padding: 22, alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  docClip: { width: 80, height: 96, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#84CC16',
    shadowColor: '#84CC16',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  clockBadge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 32 },
  body: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    width: '100%',
    borderRadius: 26,
    backgroundColor: GREEN,
    marginTop: 8,
  },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
