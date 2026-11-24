import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { usePalette } from '@shared/ui/theme';

import { usePostPhoto } from '../model/use-social';

// The photos of one post, one page each. Swipe sideways (touch, or shift and the scroll wheel on a computer) to see the next photo, or use the arrows
// and dots. Dots and a count show where you are. Each page loads its own photo.
export function PostPhotoPager({ postId, count }: { postId: string; count: number }) {
  const p = usePalette();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  function goTo(index: number) {
    const next = Math.min(count - 1, Math.max(0, index));
    setPage(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  }

  return (
    <View style={styles.box} onLayout={onLayout}>
      {width > 0 ? (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          // Sideways movement stays with the photos: a sideways swipe does not scroll the page up or down.
          directionalLockEnabled
          onScroll={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / width);
            if (next !== page) setPage(next);
          }}>
          {Array.from({ length: count }, (_, index) => (
            <PhotoPage key={index} postId={postId} position={index} width={width} />
          ))}
        </ScrollView>
      ) : null}

      {page > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Previous photo" onPress={() => goTo(page - 1)} hitSlop={8} style={[styles.arrow, styles.arrowLeft]}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>
      ) : null}
      {page < count - 1 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Next photo" onPress={() => goTo(page + 1)} hitSlop={8} style={[styles.arrow, styles.arrowRight]}>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <View pointerEvents="none" style={styles.counter}>
        <Text style={styles.counterText}>
          {page + 1}/{count}
        </Text>
      </View>
      <View style={styles.dots}>
        {Array.from({ length: count }, (_, index) => (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`Photo ${index + 1} of ${count}`}
            hitSlop={6}
            onPress={() => goTo(index)}
            style={[styles.dot, { backgroundColor: index === page ? p.accent : 'rgba(255,255,255,0.7)' }]}
          />
        ))}
      </View>
    </View>
  );
}

function PhotoPage({ postId, position, width }: { postId: string; position: number; width: number }) {
  const p = usePalette();
  const photo = usePostPhoto(postId, true, position);
  return (
    <View style={{ width, height: '100%' }}>
      {photo.data ? (
        <Image source={{ uri: photo.data }} style={styles.image} resizeMode="cover" accessibilityLabel={`Photo ${position + 1} in post`} />
      ) : photo.isError ? (
        <View style={styles.state}>
          <Ionicons name="image-outline" size={32} color={p.muted} />
          <Text style={[styles.stateText, { color: p.muted }]}>Photo could not be loaded</Text>
        </View>
      ) : (
        <View style={styles.state}>
          <ActivityIndicator color={p.accent} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1 },
  image: { width: '100%', height: '100%' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  stateText: { fontSize: 13 },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  arrowLeft: { left: 10 },
  arrowRight: { right: 10 },
  counter: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 9, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  counterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
