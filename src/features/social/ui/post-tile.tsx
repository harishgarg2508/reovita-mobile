import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';
import { usePostPhoto, type SocialPost } from '@entities/social';

// One square of the grid on a profile, like a profile page of a photo app: a post with a photo shows the photo, and a post with only words shows
// the words on a soft tile. The kudos count sits in a corner. Tapping it opens the post.
export const PostTile = memo(function PostTile({ post, size, onPress }: { post: SocialPost; size: number; onPress: (post: SocialPost) => void }) {
  const p = usePalette();
  const photo = usePostPhoto(post.id, post.has_photo);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={post.body ? `Post: ${post.body.slice(0, 60)}` : 'Photo post'}
      onPress={() => onPress(post)}
      style={[styles.tile, { width: size, height: size, backgroundColor: p.surface }]}>
      {post.has_photo ? (
        photo.data ? (
          <Image source={{ uri: photo.data }} style={styles.fill} resizeMode="cover" />
        ) : photo.isError ? (
          <Ionicons name="image-outline" size={26} color={p.muted} />
        ) : (
          <ActivityIndicator color={p.accent} />
        )
      ) : (
        <View style={[styles.words, { backgroundColor: p.accentSoft }]}>
          <Text numberOfLines={7} style={[styles.wordsText, { color: p.text }]}>{post.body}</Text>
        </View>
      )}
      {post.has_photo && post.body ? (
        <View style={styles.cornerIcon}>
          <Ionicons name="document-text" size={15} color="#FFFFFF" />
        </View>
      ) : null}
      {post.kudos_count > 0 ? (
        <View style={styles.count}>
          <Ionicons name="heart" size={11} color="#FFFFFF" />
          <Text style={styles.countText}>{post.kudos_count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  words: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 10 },
  wordsText: { fontSize: 12.5, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  cornerIcon: { position: 'absolute', top: 7, right: 7 },
  count: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  countText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
});
