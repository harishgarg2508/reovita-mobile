import { USE_NATIVE_DRIVER } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  GoogleIcon,
  LoginBgBottomMist,
  LoginBgTopLeaves,
  MiniSproutDivider,
  ReovitaLeafLogo,
} from '@shared/ui';
import { Font } from '@shared/ui/theme/tokens';

interface LoginScreenProps {
  onSignIn: () => void;
  pending: boolean;
  errorMessage: string | null;
  onBack?: () => void;
  // Shown when the account was deactivated: signing in again recovers it.
  showRecover?: boolean;
  onRecover?: () => void;
}

const INK_DARK = '#0F1B2D';
const TEXT_MUTED = '#60646C';

/**
 * Reovita Clean SSO Login Screen ("Welcome Back").
 * Exact recreation of the reference design:
 * - Exact vector botanical green leaf silhouettes in top-right (LoginBgTopLeaves)
 * - Exact vector organic lavender gradient mist curves at the bottom (LoginBgBottomMist)
 * - Centered horizontal Reovita logo emblem + Poppins wordmark
 * - Two-tone heading: "Welcome" (dark) + "Back" (royal purple) with Poppins typography
 * - "Sign in to continue to your health journey" subtitle
 * - Exact spacing matching the reference layout
 * - Subtle divider with miniature dual-leaf sprout SVG (MiniSproutDivider)
 * - Floating white pill "Sign in with Google" button with ambient purple drop glow
 * - Official 4-color Google "G" vector SVG icon
 * - Staggered cascade entrance and tactile spring press animations
 */
export function LoginScreen({ onSignIn, pending, errorMessage, showRecover, onRecover }: LoginScreenProps) {
  const accent = usePalette().accent;
  const styles = useMemo(() => makeStyles(accent), [accent]);
  const insets = useSafeAreaInsets();

  // Entrance animations
  const [animLogo] = useState(() => new Animated.Value(0));
  const [animTitle] = useState(() => new Animated.Value(0));
  const [animDivider] = useState(() => new Animated.Value(0));
  const [animButton] = useState(() => new Animated.Value(0));

  // Button interactive press scale
  const [btnScale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // Staggered cascade entrance
    Animated.stagger(90, [
      Animated.spring(animLogo, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.spring(animTitle, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(animDivider, {
        toValue: 1,
        duration: 350,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.spring(animButton, {
        toValue: 1,
        tension: 70,
        friction: 7,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [animLogo, animTitle, animDivider, animButton]);

  function onPressIn() {
    Animated.spring(btnScale, {
      toValue: 0.97,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }

  function onPressOut() {
    Animated.spring(btnScale, {
      toValue: 1,
      tension: 100,
      friction: 5,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }

  return (
    <View style={styles.screen}>
      {/* 1. Top-Right Botanical Green Leaf Petals SVG */}
      <LoginBgTopLeaves />

      {/* 2. Bottom Lavender Gradient Mist Curves SVG */}
      <LoginBgBottomMist height={220} />

      {/* 3. Main Center Content Container with exact spacing */}
      <View
        style={[
          styles.contentContainer,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
          },
        ]}>
        {/* Horizontal Centered Reovita Logo */}
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: animLogo,
              transform: [
                {
                  translateY: animLogo.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-16, 0],
                  }),
                },
              ],
            },
          ]}>
          <ReovitaLeafLogo
            size={56}
            wordmarkSize={35}
            wordmarkColor={INK_DARK}
            showWordmark={true}
            showTagline={false}
            layout="horizontal"
            fontWeight="400"
          />
        </Animated.View>

        {/* Headings: "Welcome Back" & Subtitle */}
        <Animated.View
          style={[
            styles.titleGroup,
            {
              opacity: animTitle,
              transform: [
                {
                  scale: animTitle.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}>
          <Text style={styles.mainHeading}>
            Welcome <Text style={styles.purpleText}>Back</Text>
          </Text>

          <Text style={styles.subtitle}>
            {'Sign in to continue to your\nhealth journey'}
          </Text>
        </Animated.View>

        {/* Divider with Center Miniature Leaf Sprout Emblem */}
        <Animated.View
          style={[
            styles.dividerRow,
            {
              opacity: animDivider,
              transform: [
                {
                  scaleX: animDivider.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}>
          <View style={styles.dividerLine} />

          {/* Miniature Dual-Leaf Sprout Vector Emblem */}
          <View style={styles.sproutBadge}>
            <MiniSproutDivider size={30} />
          </View>

          <View style={styles.dividerLine} />
        </Animated.View>

        {/* "Sign in with Google" Floating Pill Button */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: animButton,
              transform: [
                {
                  translateY: animButton.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
                { scale: btnScale },
              ],
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
            disabled={pending}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={onSignIn}
            style={styles.googlePillButton}>
            {pending ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={accent} />
                <Text style={styles.loadingText}>Signing in...</Text>
              </View>
            ) : (
              <View style={styles.buttonInnerRow}>
                {/* 4-Color Google "G" Icon */}
                <View style={styles.googleIconBox}>
                  <GoogleIcon size={26} />
                </View>

                {/* Vertical Divider Line */}
                <View style={styles.verticalBar} />

                {/* Button Label */}
                <Text style={styles.buttonLabel}>Sign in with Google</Text>
              </View>
            )}
          </Pressable>

          {/* Error Message Feedback */}
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
          {showRecover && onRecover ? (
            <Pressable accessibilityRole="button" onPress={onRecover} disabled={pending} style={{ marginTop: 12, alignSelf: 'center', padding: 8 }}>
              <Text style={{ color: accent, fontWeight: '700', fontSize: 15 }}>Recover my account</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const makeStyles = (ROYAL_PURPLE: string) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
  },
  // Content Layout with precise vertical distribution matching Figma
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
    zIndex: 1,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  titleGroup: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  mainHeading: {
    fontFamily: Font.semibold,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '600',
    color: INK_DARK,
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  purpleText: {
    color: ROYAL_PURPLE,
    fontFamily: Font.semibold,
    fontWeight: '600',
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 15.5,
    fontWeight: '400',
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 25,
    marginTop: 14,
  },
  // Divider with miniature sprout
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 34,
  },
  dividerLine: {
    width: 60,
    height: 1.2,
    backgroundColor: '#E5E7EB',
  },
  sproutBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
  },
  // Sign in with Google Button
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  googlePillButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: ROYAL_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    // Soft Ambient Purple Shadow / Glow
    shadowColor: ROYAL_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  googleIconBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalBar: {
    width: 1.2,
    height: 26,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 18,
  },
  buttonLabel: {
    fontFamily: Font.semibold,
    fontSize: 16,
    fontWeight: '600',
    color: INK_DARK,
    letterSpacing: -0.2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: Font.semibold,
    fontSize: 15,
    fontWeight: '600',
    color: ROYAL_PURPLE,
  },
  errorText: {
    fontFamily: Font.regular,
    color: '#E34255',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 14,
    textAlign: 'center',
  },
});
