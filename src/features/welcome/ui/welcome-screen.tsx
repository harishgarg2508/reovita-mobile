import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LeafBackdrop, ReovitaLeafLogo } from '@shared/ui';
import { useColorScheme } from '@shared/ui/theme/use-color-scheme';
import { useTheme } from '@shared/ui/theme/use-theme';

/**
 * Reovita Splash Screen.
 * Exact recreation of Image 1 from the Figma Design System:
 * - Subtle organic green leaf shapes in corners
 * - Centered Reovita Leaf Logo + "Reovita" wordmark + "Your Health, Our DNA"
 * - Left-aligned inspirational copy: "Monitor Wellness. Build Habits. Live Healthier Every Day 🌿"
 * - Purple progress bar at the bottom with automatic and tap-to-advance navigation
 */
export function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [progress] = useState(() => new Animated.Value(0.35));

  const goToLogin = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);

  useEffect(() => {
    // Smooth progress animation that fills the bottom bar
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) {
        goToLogin();
      }
    });
    return () => anim.stop();
  }, [goToLogin, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tap to continue"
      onPress={goToLogin}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Decorative soft green corner leaves matching Image 1 */}
      <LeafBackdrop />

      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 24) + 48,
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          },
        ]}>
        {/* Center: Official Reovita Logo & Tagline */}
        <View style={styles.brandCenter}>
          <ReovitaLeafLogo size={74} showWordmark showTagline layout="vertical" />
        </View>

        {/* Lower Section: Left-aligned Headline and Progress Bar */}
        <View style={styles.lowerSection}>
          <Text style={[styles.headline, { color: theme.text }]}>
            {'Monitor Wellness.\nBuild Habits. Live\nHealthier Every Day 🌿'}
          </Text>

          {/* Bottom Purple Progress Bar from Image 1 */}
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  brandCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40,
  },
  lowerSection: {
    width: '100%',
    gap: 36,
  },
  headline: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'left',
  },
  progressRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  progressTrack: {
    width: '64%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F3F1F7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7545ED', // Reovita Royal Purple
    borderRadius: 2,
  },
});
