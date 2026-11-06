import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeafBackdrop, ReovitaLeafLogo } from '@shared/ui';

const DURATION_MS = 2200;

/**
 * Reovita Splash Screen.
 * Exact recreation of Image 1 ("Splash Screen") from Figma:
 * - Subtle organic green leaf silhouettes in corners
 * - Centered vertical Reovita Leaf Logo + "Reovita" wordmark + "Your Health, Our DNA"
 * - Left-aligned inspirational copy: "Monitor Wellness. Build Habits. Live Healthier Every Day 🌿"
 * - Purple progress bar at the bottom with smooth timing animation
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0.1));
  const [animFade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
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
    outputRange: ['10%', '100%'],
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 24) + 40,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        },
      ]}>
      {/* Decorative corner organic leaves */}
      <LeafBackdrop />

      <Animated.View style={[styles.content, { opacity: animFade }]}>
        {/* Center: Official Reovita Logo & Tagline */}
        <View style={styles.brandCenter}>
          <ReovitaLeafLogo
            size={74}
            wordmarkSize={34}
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
    </View>
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
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    zIndex: 1,
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
    color: '#14121C',
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
