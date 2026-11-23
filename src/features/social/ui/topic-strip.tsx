import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, View } from 'react-native';

import { tapSelection } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_TYPE } from '@entities/social';

interface TopicOption {
  value: string | null;
  label: string;
}

interface TopicStripProps {
  options: TopicOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}

// How far one press of a chevron moves the row.
const STEP = 180;

// The row of topics. It scrolls sideways, and a chevron shows at the end that has more to see: a press moves the row along, so it can be used with a mouse
// and without a swipe. A chevron is hidden when the row is already at that end.
export function TopicStrip({ options, selected, onSelect }: TopicStripProps) {
  const p = usePalette();
  const ref = useRef<ScrollViewInstance>(null);
  const [offset, setOffset] = useState(0);
  const [content, setContent] = useState(0);
  const [width, setWidth] = useState(0);
  const x = useRef(0);

  const canLeft = offset > 2;
  const canRight = content - width - offset > 2;

  const move = (direction: -1 | 1) => {
    tapSelection();
    const max = Math.max(content - width, 0);
    const next = Math.min(Math.max(x.current + direction * STEP, 0), max);
    ref.current?.scrollTo({ x: next, animated: true });
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topics}
        scrollEventThrottle={32}
        onContentSizeChange={(w) => setContent(w)}
        onScroll={(e) => {
          x.current = e.nativeEvent.contentOffset.x;
          setOffset(x.current);
        }}>
        {options.map((t) => {
          const on = selected === t.value;
          return (
            <Pressable key={t.label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onSelect(t.value)} style={[styles.topic, on && { backgroundColor: p.accent }]}>
              <Text style={[SOCIAL_TYPE.label, { color: on ? '#FFFFFF' : p.muted }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {canLeft ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Show earlier topics" hitSlop={6} onPress={() => move(-1)} style={[styles.chevron, styles.left, { backgroundColor: p.bg, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={18} color={p.text} />
        </Pressable>
      ) : null}
      {canRight ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Show more topics" hitSlop={6} onPress={() => move(1)} style={[styles.chevron, styles.right, { backgroundColor: p.bg, borderColor: p.border }]}>
          <Ionicons name="chevron-forward" size={18} color={p.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topics: { gap: 8, paddingHorizontal: 0 },
  topic: { height: 32, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chevron: { position: 'absolute', top: 0, width: 32, height: 32, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  left: { left: 0 },
  right: { right: 0 },
});
