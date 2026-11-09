import { USE_NATIVE_DRIVER } from '@shared/lib';
import { useMemo, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// Dragging the sheet down this far, or flicking it down, closes it.
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 0.8;

// Bottom sheet that slides up from the bottom. Closes on backdrop tap, or when dragged down.
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [translateY] = useState(() => new Animated.Value(SCREEN_HEIGHT));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) translateY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > CLOSE_DISTANCE || gesture.vy > CLOSE_VELOCITY) {
            onClose();
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER, bounciness: 4 }).start();
          }
        },
      }),
    [onClose, translateY],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => {
        translateY.setValue(SCREEN_HEIGHT);
        Animated.spring(translateY, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER, bounciness: 4 }).start();
      }}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 18, 28, 0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D9D4EA',
    marginBottom: 4,
  },
});
