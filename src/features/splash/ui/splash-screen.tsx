import { USE_NATIVE_DRIVER } from '@shared/lib';
import { useEffect, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomRightLeaves, LoginBgTopLeaves } from '@shared/ui';

const DURATION_MS = 2400;
const WORDMARK = 'REOVITA';
const LETTER_STAGGER_MS = 120;
const LETTER_FADE_MS = 380;

/**
 * Reovita Splash Screen on Landing Page.
 * Exact recreation of Image 1 from Figma Design:
 * - Clean white background
 * - Botanical translucent green corner leaves in top-right and bottom-right
 * - Centered vertical Reovita Leaf Logo emblem + "Reovita" wordmark + "Your Health, Our DNA"
 * - Left-aligned inspirational copy: "Monitor Wellness. Build Habits. Live Healthier Every Day 🌿"
 * - Purple progress bar at the bottom with smooth timing animation
 * - Tap anywhere to advance immediately
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0.12));
  const [animFade] = useState(() => new Animated.Value(0));
  // One value per letter of the wordmark, each 0 (hidden, off to the right) to 1 (in place).
  const [letters] = useState(() => WORDMARK.split('').map(() => new Animated.Value(0)));

  // The letters fade in and slide into place one after another, from the first letter to the last.
  useEffect(() => {
    Animated.stagger(
      LETTER_STAGGER_MS,
      letters.map((value) => Animated.timing(value, { toValue: 1, duration: LETTER_FADE_MS, useNativeDriver: USE_NATIVE_DRIVER })),
    ).start();
  }, [letters]);

  useEffect(() => {
    Animated.timing(animFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    const timer = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      useNativeDriver: false,
    });

    timer.start(({ finished }) => {
      if (finished) onDone();
    });

    return () => timer.stop();
  }, [animFade, onDone, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['12%', '100%'],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tap to continue"
      onPress={onDone}
      style={styles.container}>
      {/* Top-right leaves: the same asset as the login screen. */}
      <LoginBgTopLeaves />
      <BottomRightLeaves size={280} />

      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 24) + 20,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
            opacity: animFade,
          },
        ]}>
        {/* Center: Official Reovita Logo & Tagline */}
        <View style={styles.brandCenter}>
          <Image source={require('../../../shared/assets/images/reovita-logo.webp')} style={styles.logo} resizeMode="contain" />
          <View style={styles.wordRow} accessibilityRole="header" accessibilityLabel="Reovita">
            {WORDMARK.split('').map((letter, i) => (
              <Animated.Text
                key={`${letter}-${i}`}
                style={[
                  styles.wordmark,
                  {
                    opacity: letters[i],
                    transform: [
                      {
                        translateX: letters[i].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
                      },
                    ],
                  },
                ]}>
                {letter}
              </Animated.Text>
            ))}
          </View>
        </View>

        {/* Lower Section: Left-aligned Headline and Progress Bar */}
        <View style={styles.lowerSection}>
          <Text style={styles.headline}>
            {'Monitor Wellness.\nBuild Habits. Live\nHealthier Every Day 🌿'}
          </Text>

          {/* Bottom Purple Progress Bar */}
          <View style={styles.progressRow}>
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityLabel="Loading">
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  brandCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  wordRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  wordmark: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 34,
    letterSpacing: 4,
    color: '#100C22',
  },
  lowerSection: {
    width: '100%',
    gap: 36,
  },
  headline: {
    paddingHorizontal: 32,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 26,
    lineHeight: 36,
    color: '#100C22',
    letterSpacing: -0.6,
    textAlign: 'left',
  },
  progressRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  progressTrack: {
    width: 220,
    height: 4.5,
    borderRadius: 999,
    backgroundColor: '#EDE8F5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1F6F3F', // Reovita Royal Purple
    borderRadius: 999,
  },
});
