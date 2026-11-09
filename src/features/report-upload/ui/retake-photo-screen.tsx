import { USE_NATIVE_DRIVER } from '@shared/lib';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBackOr, RetakeCameraGraphic } from '@shared/ui';

/**
 * Reovita Retake Photo Screen.
 * Exact recreation of Screen 4 from the Figma Design System with error shake & pulse animations:
 * - Header bar: '← Retake Photo'
 * - Large frosted grey card with camera silhouette & red exclamation mark badge
 * - Gentle shake entrance on the camera card & pulsing exclamation badge
 * - 'Image too blurry' title & clearer photo prompt
 * - Solid royal purple 'Retake Photo' button & 'Back' link
 */
export function RetakePhotoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Entrance shake animation
  const [shakeX] = useState(() => new Animated.Value(0));
  // Badge breathing scale
  const [badgeScale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // 1. Initial attention shake
    const shakeAnim = Animated.sequence([
      Animated.delay(300),
      Animated.timing(shakeX, { toValue: -8, duration: 80, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: 8, duration: 80, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: -6, duration: 80, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: 6, duration: 80, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: 0, duration: 80, useNativeDriver: USE_NATIVE_DRIVER }),
    ]);
    shakeAnim.start();

    // 2. Continuous subtle badge pulse
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeScale, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(badgeScale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    pulseAnim.start();

    return () => {
      shakeAnim.stop();
      pulseAnim.stop();
    };
  }, [shakeX, badgeScale]);

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, 20) + 8,
          paddingBottom: Math.max(insets.bottom, 20) + 20,
        },
      ]}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => goBackOr(router, '/(app)/reports/upload')}
          style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Retake Photo</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Main Center Content */}
      <View style={styles.centerContent}>
        {/* Animated Camera Graphic with Shake */}
        <Animated.View
          style={[
            styles.graphicContainer,
            {
              transform: [{ translateX: shakeX }],
            },
          ]}>
          <RetakeCameraGraphic width={260} height={190} />
        </Animated.View>

        {/* Error Titles */}
        <Text style={styles.mainTitle}>Image too blurry</Text>
        <Text style={styles.subtitle}>
          Please take a clearer photo{'\n'}of your report.
        </Text>
      </View>

      {/* Bottom Action Buttons */}
      <View style={styles.actionColumn}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/reports/upload')}
          style={styles.retakeBtn}>
          <Text style={styles.retakeBtnText}>Retake Photo</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => goBackOr(router, '/(app)/reports/upload')}
          style={styles.backLink}>
          <Text style={styles.backLinkText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#171717',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#171717',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  graphicContainer: {
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#171717',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionColumn: {
    gap: 14,
    width: '100%',
    paddingBottom: 4,
  },
  retakeBtn: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#7545ED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7545ED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  retakeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7545ED',
  },
});

