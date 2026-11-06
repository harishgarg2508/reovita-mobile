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

interface YearWheelProps {
  value: number;
  minYear: number;
  maxYear: number;
  onChange: (year: number) => void;
}

// Scrolling year picker with guaranteed auto-centering on scroll stop across all platforms.
export function YearWheel({ value, minYear, maxYear, onChange }: YearWheelProps) {
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) list.push(y);
    return list;
  }, [minYear, maxYear]);

  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const indexOf = useCallback((year: number) => maxYear - year, [maxYear]);

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

  // Chevrons: '<' decrements birth year (e.g. 1963 -> 1962), '>' increments birth year
  const handlePrevYear = () => {
    if (currentYear > minYear) {
      animateToCenter(indexOf(currentYear - 1));
    }
  };

  const handleNextYear = () => {
    if (currentYear < maxYear) {
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
          accessibilityLabel="Previous year"
          disabled={currentYear <= minYear}
          onPress={handlePrevYear}
          hitSlop={12}
          style={styles.chevronBtn}>
          <Ionicons
            name="chevron-back"
            size={18}
            color={currentYear <= minYear ? '#C5BDD4' : '#7545ED'}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next year"
          disabled={currentYear >= maxYear}
          onPress={handleNextYear}
          hitSlop={12}
          style={styles.chevronBtn}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={currentYear >= maxYear ? '#C5BDD4' : '#7545ED'}
          />
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
    left: 11,
    right: 11,
    top: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
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
    color: '#7545ED',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
