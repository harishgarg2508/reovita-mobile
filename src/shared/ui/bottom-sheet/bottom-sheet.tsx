import { USE_NATIVE_DRIVER } from '@shared/lib';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';
import { useMemo, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// Dragging the sheet down this far, or flicking it down, closes it.
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 0.8;

// Bottom sheet that slides up from the bottom. Closes on backdrop tap, or when dragged down.
export function BottomSheet({
  visible,
  onClose,
  children,
  dragHandleOnly = false,
  flush = false,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  // true: only the handle at the top drags the sheet closed, so a scrolling list inside it can be scrolled freely.
  dragHandleOnly?: boolean;
  // true: no side or bottom padding and no gap, for content that draws its own edges (a post shown whole).
  flush?: boolean;
}) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View style={[styles.sheet, flush && styles.sheetFlush, { transform: [{ translateY }] }]} {...(dragHandleOnly ? {} : panResponder.panHandlers)}>
          <View style={styles.handleArea} {...(dragHandleOnly ? panResponder.panHandlers : {})}>
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  // The same dimmed (and, in browsers, blurred) backdrop as the confirm dialog: the screen behind the sheet stays visible.
  scrim: {
    backgroundColor: 'rgba(15, 12, 24, 0.45)',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as object) : {}),
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  sheetFlush: { paddingHorizontal: 0, paddingBottom: 0, gap: 0 },
  handleArea: {
    alignSelf: 'stretch',
    paddingVertical: 6,
    alignItems: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border2,
    marginBottom: 4,
  },
});
