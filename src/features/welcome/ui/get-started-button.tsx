import { USE_NATIVE_DRIVER } from '@shared/lib';
import { useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { tapConfirm } from '@shared/lib/haptics';

interface GetStartedButtonProps {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}

const THUMB_SIZE = 48;
const TRACK_PADDING = 8;
const TRACK_HEIGHT = 64;

/**
 * Reovita Action Pill ("Slide to Start").
 * Recreates the slidable capsule button from the Reovita Design System:
 * - Obsidian black track (#171717)
 * - Draggable Volt Lime circular thumb (#D4FF3F) with dark checkmark
 * - Centered "Get Started" label that fades as thumb advances
 * - End-cap chevrons (››)
 * - Tactile haptic feedback and spring snap
 */
export function GetStartedButton({
  onPress,
  label = 'Get Started',
  disabled = false,
}: GetStartedButtonProps) {
  const [trackWidth, setTrackWidth] = useState(320);
  const [translateX] = useState(() => new Animated.Value(0));

  const maxDistance = Math.max(0, trackWidth - THUMB_SIZE - TRACK_PADDING * 2);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !disabled && Math.abs(gestureState.dx) > 3,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gestureState) => {
          const currentMax = Math.max(0, trackWidth - THUMB_SIZE - TRACK_PADDING * 2);
          const clamped = Math.max(0, Math.min(gestureState.dx, currentMax));
          translateX.setValue(clamped);
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentMax = Math.max(0, trackWidth - THUMB_SIZE - TRACK_PADDING * 2);
          const threshold = currentMax * 0.65;

          if (gestureState.dx >= threshold) {
            Animated.timing(translateX, {
              toValue: currentMax,
              duration: 150,
              useNativeDriver: USE_NATIVE_DRIVER,
            }).start(() => {
              tapConfirm();
              onPress();
              setTimeout(() => {
                translateX.setValue(0);
              }, 600);
            });
          } else if (Math.abs(gestureState.dx) < 10) {
            // Tap nudge
            tapConfirm();
            Animated.sequence([
              Animated.timing(translateX, {
                toValue: Math.min(36, currentMax * 0.3),
                duration: 160,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
              Animated.spring(translateX, {
                toValue: 0,
                bounciness: 9,
                speed: 18,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
            ]).start();
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              bounciness: 6,
              speed: 20,
              useNativeDriver: USE_NATIVE_DRIVER,
            }).start();
          }
        },
      }),
    [disabled, onPress, trackWidth, translateX]
  );

  function handleTrackLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - trackWidth) > 1) {
      setTrackWidth(w);
    }
  }

  const textOpacity = translateX.interpolate({
    inputRange: [0, Math.max(1, maxDistance * 0.45)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const chevronsOpacity = translateX.interpolate({
    inputRange: [Math.max(1, maxDistance * 0.5), Math.max(1, maxDistance)],
    outputRange: [0.65, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      onLayout={handleTrackLayout}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityHint="Slide the green circle to the right to get started"
      style={[styles.track, disabled && styles.trackDisabled]}>
      {/* Center Label (Fades out when sliding) */}
      <Animated.View
        pointerEvents="none"
        style={[styles.labelContainer, { opacity: textOpacity }]}>
        <Text style={styles.label}>{label}</Text>
      </Animated.View>

      {/* Right Chevrons */}
      <Animated.View
        pointerEvents="none"
        style={[styles.chevronsContainer, { opacity: chevronsOpacity }]}>
        <Text style={styles.chevrons}>››</Text>
      </Animated.View>

      {/* Draggable Volt Lime Thumb */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          {
            transform: [{ translateX }],
          },
        ]}>
        <Text style={styles.thumbCheckmark}>✓</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#171717',
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: TRACK_PADDING,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  trackDisabled: {
    opacity: 0.5,
  },
  labelContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  chevronsContainer: {
    position: 'absolute',
    right: 22,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevrons: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -2,
  },
  thumb: {
    position: 'absolute',
    left: TRACK_PADDING,
    top: TRACK_PADDING,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#D4FF3F', // Reovita Volt Lime
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbCheckmark: {
    color: '#14121C',
    fontSize: 22,
    fontWeight: '800',
    marginTop: -1,
  },
});

