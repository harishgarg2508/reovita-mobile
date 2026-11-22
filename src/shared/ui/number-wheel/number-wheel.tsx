import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { tapSelection } from '@shared/lib';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

const ITEM_HEIGHT = 44;
const VISIBLE = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE; // 132
// How long the wheel must be still before it lands on a row. A mouse wheel sends its turns a fraction of a second apart.
const SETTLE_DELAY_MS = 180;

interface NumberWheelProps {
  value: number;
  minValue: number;
  maxValue: number;
  onChange: (year: number) => void;
  // Text after each number, for example ' h' for hours.
  suffix?: string;
  // For a narrow wheel: no arrows (scroll or tap a number), and a smaller font, so nothing covers the digits.
  compact?: boolean;
}

interface WheelRowProps {
  year: number;
  index: number;
  selected: boolean;
  compact: boolean;
  suffix: string;
  styles: ReturnType<typeof createStyles>;
  onPick: (index: number) => void;
}

// One number of the wheel. Memoised: a wheel can hold thousands of numbers, and only the row that was selected and the one that is now should redraw.
const WheelRow = memo(function WheelRow({ year, index, selected, compact, suffix, styles, onPick }: WheelRowProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Select ${year}${suffix}`} onPress={() => onPick(index)} style={styles.item}>
      <Text style={[styles.year, compact && styles.yearCompact, selected && styles.yearSelected, selected && compact && styles.yearSelectedCompact]}>
        {year}
        {suffix}
      </Text>
    </Pressable>
  );
});

// Scrolling number picker with guaranteed auto-centering on scroll stop across all platforms.
export function NumberWheel({ value, minValue, maxValue, onChange, suffix = '', compact = false }: NumberWheelProps) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = minValue; y <= maxValue; y++) list.push(y);
    return list;
  }, [minValue, maxValue]);

  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const clampIndex = useCallback((index: number) => Math.max(0, Math.min(years.length - 1, index)), [years.length]);
  const indexOf = useCallback((year: number) => year - minValue, [minValue]);

  const initialIndex = clampIndex(indexOf(value));
  // The row shown as selected while the wheel moves. The form is told the year only when the wheel has settled on a row.
  const [centerIndex, setCenterIndex] = useState(initialIndex);
  const latestOffsetRef = useRef(initialIndex * ITEM_HEIGHT);
  const isDraggingRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // While the wheel is moved by the code (a tap, or the snap itself) its scroll events are not a new gesture, so they are ignored.
  const ignoreScrollUntilRef = useRef(0);
  // The latest value and callback, so a timer that fires later never uses an old one.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  // Tells the form the year of a row, once, when it differs from the year the form already has.
  const commit = useCallback(
    (index: number) => {
      const year = years[clampIndex(index)];
      if (year !== undefined && year !== valueRef.current) {
        valueRef.current = year;
        onChangeRef.current(year);
      }
    },
    [years, clampIndex],
  );

  const scrollToRow = useCallback((index: number, animated: boolean) => {
    ignoreScrollUntilRef.current = Date.now() + (animated ? 350 : 80);
    latestOffsetRef.current = index * ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
  }, []);

  // The wheel has stopped: land exactly on the nearest row, and report that row's year. A wheel that is still being moved
  // (touch drag, or a mouse wheel turning) is never snapped back, because this only runs after it has been still for a moment.
  const settle = useCallback(() => {
    clearSettleTimer();
    if (isDraggingRef.current) return;
    const index = clampIndex(Math.round(latestOffsetRef.current / ITEM_HEIGHT));
    setCenterIndex(index);
    commit(index);
    if (Math.abs(latestOffsetRef.current - index * ITEM_HEIGHT) > 0.5) {
      tapSelection();
      scrollToRow(index, true);
    }
  }, [clampIndex, clearSettleTimer, commit, scrollToRow]);

  // A year changed from outside (the form was loaded or reset): move the wheel to it, unless it is already there.
  useEffect(() => {
    if (isDraggingRef.current) return;
    const target = clampIndex(indexOf(value));
    if (Math.round(latestOffsetRef.current / ITEM_HEIGHT) !== target) {
      setCenterIndex(target);
      scrollToRow(target, true);
    }
  }, [value, clampIndex, indexOf, scrollToRow]);

  // A tap on a row or a chevron: move there and report it at once.
  const animateToCenter = useCallback(
    (index: number) => {
      clearSettleTimer();
      const clamped = clampIndex(index);
      setCenterIndex(clamped);
      commit(clamped);
      tapSelection();
      scrollToRow(clamped, true);
    },
    [clampIndex, clearSettleTimer, commit, scrollToRow],
  );

  const onScrollBeginDrag = useCallback(() => {
    isDraggingRef.current = true;
    clearSettleTimer();
  }, [clearSettleTimer]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Date.now() < ignoreScrollUntilRef.current) return;
      const offsetY = e.nativeEvent.contentOffset.y;
      latestOffsetRef.current = offsetY;
      const index = clampIndex(Math.round(offsetY / ITEM_HEIGHT));
      setCenterIndex((current) => {
        if (current !== index) tapSelection();
        return index;
      });
      // Any scrolling that is not a finger on the screen (the mouse wheel, the keyboard) settles after a pause.
      if (!isDraggingRef.current) {
        clearSettleTimer();
        settleTimerRef.current = setTimeout(settle, SETTLE_DELAY_MS);
      }
    },
    [clampIndex, clearSettleTimer, settle],
  );

  const onScrollEndDrag = useCallback(() => {
    isDraggingRef.current = false;
    // The finger is up. The wheel may still be coasting, and every scroll event pushes this back; it runs once it is still.
    clearSettleTimer();
    settleTimerRef.current = setTimeout(settle, SETTLE_DELAY_MS);
  }, [clearSettleTimer, settle]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isDraggingRef.current = false;
      latestOffsetRef.current = e.nativeEvent.contentOffset.y;
      settle();
    },
    [settle],
  );

  useEffect(() => clearSettleTimer, [clearSettleTimer]);

  const currentYear = years[centerIndex] ?? value;

  // Chevrons step the value down (up arrow) and up (down arrow)
  const handlePrevYear = () => {
    if (currentYear > minValue) {
      animateToCenter(indexOf(currentYear - 1));
    }
  };

  const handleNextYear = () => {
    if (currentYear < maxValue) {
      animateToCenter(indexOf(currentYear + 1));
    }
  };

  return (
    <View style={styles.wheel}>
      {/* Highlight band for the selected row */}
      <View pointerEvents="none" style={styles.band} />

      {/* Interactive chevrons layer on top of the band */}
      {compact ? null : (
      <View pointerEvents="box-none" style={styles.chevronOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lower value"
          disabled={currentYear <= minValue}
          onPress={handlePrevYear}
          hitSlop={12}
          style={styles.chevronBtn}>
          <Ionicons name="chevron-up" size={18} color={currentYear <= minValue ? colors.disabledIcon : colors.accent} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Higher value"
          disabled={currentYear >= maxValue}
          onPress={handleNextYear}
          hitSlop={12}
          style={styles.chevronBtn}>
          <Ionicons name="chevron-down" size={18} color={currentYear >= maxValue ? colors.disabledIcon : colors.accent} />
        </Pressable>
      </View>
      )}

      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        style={{ height: WHEEL_HEIGHT }}
        contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
        onLayout={() => {
          scrollRef.current?.scrollTo({ y: latestOffsetRef.current, animated: false });
        }}
        // The phone snaps by itself. In the browser the wheel settles in code, after it has stopped, so it is never pulled back mid-scroll.
        snapToInterval={Platform.OS === 'web' ? undefined : ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate={Platform.OS === 'web' ? 'normal' : 'fast'}
        scrollEventThrottle={16}
        onScrollBeginDrag={onScrollBeginDrag}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}>
        {years.map((year, index) => (
          <WheelRow key={year} year={year} index={index} selected={index === centerIndex} compact={compact} suffix={suffix} styles={styles} onPick={animateToCenter} />
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  wheel: {
    height: WHEEL_HEIGHT + 2, // 134px allows exactly 132px inner height after 1px top/bottom border
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    left: 11,
    right: 11,
    top: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    zIndex: 0,
  },
  chevronOverlay: {
    position: 'absolute',
    right: 8,
    top: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    zIndex: 2,
  },
  chevronBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearCompact: { fontSize: 16 },
  yearSelectedCompact: { fontSize: 19 },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  year: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 18,
    color: colors.placeholder,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  yearSelected: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 24,
    color: colors.accent,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
