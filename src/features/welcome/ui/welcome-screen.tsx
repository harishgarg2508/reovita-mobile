import { USE_NATIVE_DRIVER } from '@shared/lib';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BottomRightLeaves, ReovitaLeafLogo, TopRightLeaves } from '@shared/ui';

const DURATION_MS = 2400;

/**
 * Reovita Welcome / Splash Screen.
 * Exact recreation of Image 1 from Figma Design:
 * - Clean white background
 * - Botanical translucent green corner leaves in top-right and bottom-right
 * - Centered vertical Reovita Leaf Logo emblem + "Reovita" wordmark + "Your Health, Our DNA"
 * - Left-aligned inspirational copy: "Monitor Wellness. Build Habits. Live Healthier Every Day 🌿"
 * - Purple progress bar at the bottom with automatic and tap-to-advance navigation
 */
export function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [progress] = useState(() => new Animated.Value(0.12));
  const [animFade] = useState(() => new Animated.Value(0));

  const goToLogin = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);

  useEffect(() => {
    Animated.timing(animFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) {
        goToLogin();
      }
    });
    return () => anim.stop();
  }, [animFade, goToLogin, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['12%', '100%'],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tap to continue"
      onPress={goToLogin}
      style={styles.container}>
      <StatusBar style="dark" />

      {/* Decorative botanical translucent leaves in top-right and bottom-right */}
      <TopRightLeaves size={260} />
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
          <ReovitaLeafLogo
            size={84}
            wordmarkSize={44}
            wordmarkColor="#100C22"
            taglineSize={16}
            taglineColor="#1B152B"
            showWordmark={true}
            showTagline={true}
            layout="vertical"
          />
        </View>

        {/* Lower Section: Left-aligned Headline and Progress Bar */}
        <View style={styles.lowerSection}>
          <Text style={styles.headline}>
            {'Monitor Wellness.\nBuild Habits. Live\nHealthier Every Day 🌿'}
          </Text>

          {/* Bottom Purple Progress Bar from Image 1 */}
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
    backgroundColor: '#7545ED', // Reovita Royal Purple
    borderRadius: 999,
  },
});
