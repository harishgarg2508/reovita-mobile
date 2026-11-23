import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { usePalette } from '@shared/ui/theme';

import { usePostPhoto } from '../model/use-social';

// The photos of one post, one page each: swipe sideways to see the next. Dots and a count show where you are. Each page loads its own photo.
export function PostPhotoPager({ postId, count }: { postId: string; count: number }) {
  const p = usePalette();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.box} onLayout={onLayout}>
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / width);
            if (next !== page) setPage(next);
          }}>
          {Array.from({ length: count }, (_, index) => (
            <PhotoPage key={index} postId={postId} position={index} width={width} />
          ))}
        </ScrollView>
      ) : null}
      <View pointerEvents="none" style={styles.counter}>
        <Text style={styles.counterText}>
          {page + 1}/{count}
        </Text>
      </View>
      <View pointerEvents="none" style={styles.dots}>
        {Array.from({ length: count }, (_, index) => (
          <View key={index} style={[styles.dot, { backgroundColor: index === page ? p.accent : 'rgba(255,255,255,0.7)' }]} />
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
  counter: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 9, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  counterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
