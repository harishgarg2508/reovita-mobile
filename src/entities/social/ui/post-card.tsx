import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';

import { usePostPhoto } from '../model/use-social';
import type { SocialPost } from '../model/social.types';

// The date of a post, like "Fri, 20 Nov 2026".
function postDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// One post in a feed: who posted and when, the text, the photo, the kudos count, and the Kudos and Share buttons.
// The actions belong to the screen that owns the list, so it passes them in.
export const PostCard = memo(function PostCard({
  post,
  onKudos,
  onShare,
  onKudosList,
  onMenu,
  onOpenProfile,
}: {
  post: SocialPost;
  onKudos: (post: SocialPost) => void;
  onShare: (post: SocialPost) => void;
  // Opens the list of people who gave kudos. Only given for my own posts: the list is for the author.
  onKudosList?: (post: SocialPost) => void;
  onMenu: (post: SocialPost) => void;
  onOpenProfile?: (handle: string) => void;
}) {
  const p = usePalette();
  const photo = usePostPhoto(post.id, post.has_photo);
  const name = post.display_name || `@${post.handle}`;

  return (
    <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" disabled={!onOpenProfile} onPress={() => onOpenProfile?.(post.handle)} style={styles.who}>
          <View style={[styles.avatar, { backgroundColor: p.accentSoft }]}>
            <Text style={[styles.avatarText, { color: p.accent }]}>{post.handle.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.names}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={[styles.name, { color: p.text }]}>{name}</Text>
              <Text numberOfLines={1} style={[styles.date, { color: p.muted }]}>{postDate(post.created_at)}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.sub, { color: p.muted }]}>@{post.handle}</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="More" hitSlop={10} onPress={() => onMenu(post)}>
          <Ionicons name="ellipsis-vertical" size={20} color={p.muted} />
        </Pressable>
      </View>

      {post.body ? <Text style={[styles.body, { color: p.text }]}>{post.body}</Text> : null}

      {post.has_photo ? (
        <View style={[styles.photoBox, { backgroundColor: p.surface }]}>
          {photo.data ? (
            <Image source={{ uri: photo.data }} style={styles.photo} resizeMode="cover" accessibilityLabel="Photo in the post" />
          ) : photo.isError ? (
            <Text style={[styles.sub, { color: p.muted }]}>The photo could not be loaded</Text>
          ) : (
            <ActivityIndicator color={p.accent} />
          )}
        </View>
      ) : null}

      {post.kudos_count > 0 ? (
        <Pressable
          accessibilityRole={post.is_mine && onKudosList ? 'button' : undefined}
          accessibilityLabel={post.is_mine && onKudosList ? `See who gave kudos: ${post.kudos_count}` : undefined}
          disabled={!(post.is_mine && onKudosList)}
          onPress={() => onKudosList?.(post)}
          hitSlop={6}
          style={styles.meta}>
          <Ionicons name="heart" size={12} color={p.accent} />
          <Text style={[styles.metaText, { color: post.is_mine && onKudosList ? p.accent : p.muted }, post.is_mine && onKudosList && { fontWeight: '700' }]}>{post.kudos_count} kudos</Text>
          {post.is_mine && onKudosList ? <Ionicons name="chevron-forward" size={12} color={p.accent} /> : null}
        </Pressable>
      ) : null}

      <View style={[styles.actions, { borderTopColor: p.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={post.kudoed ? 'Take back kudos' : 'Give kudos'}
          accessibilityState={{ selected: post.kudoed }}
          hitSlop={6}
          onPress={() => onKudos(post)}
          style={styles.action}>
          <Ionicons name={post.kudoed ? 'heart' : 'heart-outline'} size={18} color={post.kudoed ? p.accent : p.muted} />
          <Text style={[styles.actionText, { color: post.kudoed ? p.accent : p.muted }]}>Kudos</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Share" hitSlop={6} onPress={() => onShare(post)} style={styles.action}>
          <Ionicons name="arrow-redo-outline" size={18} color={p.muted} />
          <Text style={[styles.actionText, { color: p.muted }]}>Share</Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 4, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800' },
  names: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  date: { fontSize: 12 },
  sub: { fontSize: 12 },
  body: { fontSize: 14.5, lineHeight: 21 },
  photoBox: { borderRadius: 18, overflow: 'hidden', minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', aspectRatio: 16 / 11 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14 },
  actionText: { fontSize: 13, fontWeight: '700' },
});
