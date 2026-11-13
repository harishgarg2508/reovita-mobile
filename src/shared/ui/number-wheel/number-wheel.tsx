import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { tapSelection } from '@shared/lib';

const ITEM_HEIGHT = 44;
const VISIBLE = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE; // 132

interface NumberWheelProps {
  value: number;
  minValue: number;
  maxValue: number;
  onChange: (year: number) => void;
}

// Scrolling number picker with guaranteed auto-centering on scroll stop across all platforms.
export function NumberWheel({ value, minValue, maxValue, onChange }: NumberWheelProps) {
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = minValue; y <= maxValue; y++) list.push(y);
    return list;
  }, [minValue, maxValue]);

  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const indexOf = useCallback((year: number) => year - minValue, [minValue]);

  const initialIndex = Math.max(0, Math.min(years.length - 1, indexOf(value)));
  const [centerIndex, setCenterIndex] = useState(initialIndex);
  const activeIndexRef = useRef(initialIndex);
  const latestOffsetRef = useRef(initialIndex * ITEM_HEIGHT);
  const isDraggingRef = useRef(false);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state if value changes externally while user is not interacting
  useEffect(() => {
    if (!isDraggingRef.current) {
      const target = Math.max(0, Math.min(years.length - 1, indexOf(value)));
      if (target !== activeIndexRef.current) {
        activeIndexRef.current = target;
        latestOffsetRef.current = target * ITEM_HEIGHT;
        setCenterIndex(target);
        scrollRef.current?.scrollTo({ y: target * ITEM_HEIGHT, animated: true });
      }
    }
  }, [value, indexOf, years.length]);

  // Guaranteed snap to nearest row center when scrolling stops
  const snapToNearestCenter = useCallback(() => {
    if (isDraggingRef.current) return;

    const currentY = latestOffsetRef.current;
    const targetIndex = Math.max(0, Math.min(years.length - 1, Math.round(currentY / ITEM_HEIGHT)));
    const targetOffset = targetIndex * ITEM_HEIGHT;

    // If already dead center (within 0.5px), just ensure state is committed
    if (Math.abs(currentY - targetOffset) <= 0.5) {
      if (targetIndex !== activeIndexRef.current) {
        activeIndexRef.current = targetIndex;
        setCenterIndex(targetIndex);
        const selectedYear = years[targetIndex];
        if (selectedYear !== undefined && selectedYear !== value) {
          onChange(selectedYear);
        }
      }
      return;
    }

    // Auto-animate smoothly to exact center
    activeIndexRef.current = targetIndex;
    latestOffsetRef.current = targetOffset;
    setCenterIndex(targetIndex);

    const selectedYear = years[targetIndex];
    if (selectedYear !== undefined && selectedYear !== value) {
      onChange(selectedYear);
    }
    tapSelection();

    scrollRef.current?.scrollTo({
      y: targetOffset,
      animated: true,
    });
  }, [years, value, onChange]);

  // Programmatic smooth scroll to a target index (used by taps on chevrons or year rows)
  const animateToCenter = useCallback(
    (index: number) => {
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
        scrollEndTimerRef.current = null;
      }

      const clamped = Math.max(0, Math.min(years.length - 1, index));
      const targetOffset = clamped * ITEM_HEIGHT;

      activeIndexRef.current = clamped;
      latestOffsetRef.current = targetOffset;
      setCenterIndex(clamped);

      const selectedYear = years[clamped];
      if (selectedYear !== undefined && selectedYear !== value) {
        onChange(selectedYear);
      }
      tapSelection();

      scrollRef.current?.scrollTo({
        y: targetOffset,
        animated: true,
      });
    },
    [years, value, onChange]
  );

  const onScrollBeginDrag = useCallback(() => {
    isDraggingRef.current = true;
    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = null;
    }
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      latestOffsetRef.current = offsetY;

      const index = Math.max(0, Math.min(years.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
      if (index !== activeIndexRef.current) {
        activeIndexRef.current = index;
        setCenterIndex(index);
        tapSelection();
      }

      // If user has released finger, auto-center once scrolling motion pauses/stops
      if (!isDraggingRef.current) {
        if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
        scrollEndTimerRef.current = setTimeout(snapToNearestCenter, 80);
      }
    },
    [years.length, snapToNearestCenter]
  );

  const onScrollEndDrag = useCallback(() => {
    isDraggingRef.current = false;
    // User lifted finger: schedule snap-to-center as soon as scrolling stops
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = setTimeout(snapToNearestCenter, 80);
  }, [snapToNearestCenter]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isDraggingRef.current = false;
      latestOffsetRef.current = e.nativeEvent.contentOffset.y;
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
        scrollEndTimerRef.current = null;
      }
      snapToNearestCenter();
    },
    [snapToNearestCenter]
  );

  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, []);

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
      <View pointerEvents="box-none" style={styles.chevronOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lower value"
          disabled={currentYear <= minValue}
          onPress={handlePrevYear}
          hitSlop={12}
          style={styles.chevronBtn}>
          <Ionicons name="chevron-up" size={18} color={currentYear <= minValue ? '#C5BDD4' : '#1F6F3F'} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Higher value"
          disabled={currentYear >= maxValue}
          onPress={handleNextYear}
          hitSlop={12}
          style={styles.chevronBtn}>
          <Ionicons name="chevron-down" size={18} color={currentYear >= maxValue ? '#C5BDD4' : '#1F6F3F'} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        style={{ height: WHEEL_HEIGHT }}
        contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
        onLayout={() => {
          scrollRef.current?.scrollTo({
            y: activeIndexRef.current * ITEM_HEIGHT,
            animated: false,
          });
        }}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScrollBeginDrag={onScrollBeginDrag}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}>
        {years.map((year, index) => {
          const selected = index === centerIndex;
          return (
            <Pressable
              key={year}
              accessibilityRole="button"
              accessibilityLabel={`Select year ${year}`}
              onPress={() => animateToCenter(index)}
              style={styles.item}>
              <Text style={[styles.year, selected && styles.yearSelected]}>
                {year}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    height: WHEEL_HEIGHT + 2, // 134px allows exactly 132px inner height after 1px top/bottom border
    borderWidth: 1,
    borderColor: '#E5E0EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F1EDF7',
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
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  year: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 18,
    color: '#9185AA',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  yearSelected: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 24,
    color: '#1F6F3F',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
