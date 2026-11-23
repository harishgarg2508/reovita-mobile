import { Ionicons } from '@expo/vector-icons';
import { memo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { tapSelection } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';

import { usePostPhoto } from '../model/use-social';
import { topicLabel } from '../model/social-topics';
import { SocialAvatar } from './social-avatar';
import type { SocialPost } from '../model/social.types';

// Format count in compact social style like "5,2k" or "140".
export function formatSocialCount(count: number): string {
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1).replace('.', ',') + 'M';
  }
  if (count >= 1_000) {
    return (count / 1_000).toFixed(1).replace('.', ',') + 'k';
  }
  return String(count);
}

// How long ago a post was made, like "5m", "3h", "2d", and the date once it is a week old ("20 Nov", or "20 Nov 2025" in an earlier year).
function postAge(iso: string): string {
  const then = new Date(iso);
  const minutes = Math.max(0, Math.floor((Date.now() - then.getTime()) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d`;
  const sameYear = then.getFullYear() === new Date().getFullYear();
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

// The full date, for a screen reader.
const fullDate = (iso: string): string => new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// One post in a feed, in one plain layout for every kind of post:
//   author row (avatar, name, @handle and how long ago, a quiet "more" button)
//   the post: a text post reads as large text, a photo post as a rounded picture, with the caption under the actions
//   one action row under it: kudos, comments, share on the left, save on the right (never drawn over the picture)
//   small tags under that: the streak stamp and the topic
export const PostCard = memo(function PostCard({
  post,
  onKudos,
  onShare,
  onKudosList,
  onMenu,
  onSave,
  onComments,
  onOpenProfile,
  flush = false,
}: {
  post: SocialPost;
  onKudos: (post: SocialPost) => void;
  onShare: (post: SocialPost) => void;
  onKudosList?: (post: SocialPost) => void;
  onMenu: (post: SocialPost) => void;
  // The bookmark: save or un-save this post.
  onSave?: (post: SocialPost) => void;
  // The comment button: opens the comments of the post.
  onComments?: (post: SocialPost) => void;
  onOpenProfile?: (handle: string) => void;
  // true: the card touches both sides of the screen, with no side border and square side corners.
  flush?: boolean;
}) {
  const p = usePalette();
  const photo = usePostPhoto(post.id, post.has_photo);
  const name = post.display_name || `@${post.handle}`;
  const topic = topicLabel(post.topic);

  const handleLike = () => {
    tapSelection();
    onKudos(post);
  };

  // Double tap on the post gives kudos, like other social apps. It only adds kudos (a second double tap never takes it back), and a heart pops up.
  const lastTap = useRef(0);
  const [heart] = useState(() => new Animated.Value(0));
  const onPostTap = () => {
    const now = Date.now();
    if (now - lastTap.current > 300) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    if (!post.kudoed) handleLike();
    heart.setValue(0);
    Animated.sequence([
      Animated.spring(heart, { toValue: 1, useNativeDriver: true, friction: 5, tension: 160 }),
      Animated.delay(350),
      Animated.timing(heart, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };
  const heartStyle = { opacity: heart, transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] };

  // Holding the kudos button on my own post shows who gave kudos.
  const handleKudosList = () => {
    if (post.is_mine && onKudosList) {
      tapSelection();
      onKudosList(post);
    }
  };

  const openMenu = () => {
    tapSelection();
    onMenu(post);
  };

  return (
    <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }, flush && styles.flush]}>
      {/* Author row */}
      <View style={styles.head}>
        <Pressable accessibilityRole="button" disabled={!onOpenProfile} onPress={() => onOpenProfile?.(post.handle)} style={styles.authorRow}>
          <SocialAvatar handle={post.handle} hasAvatar={post.has_avatar} size={40} />
          <View style={styles.names}>
            <Text numberOfLines={1} style={[styles.name, { color: p.text }]}>{name}</Text>
            <Text numberOfLines={1} accessibilityLabel={`@${post.handle}, ${fullDate(post.created_at)}`} style={[styles.sub, { color: p.muted }]}>
              @{post.handle} · {postAge(post.created_at)}
            </Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="More options" hitSlop={10} onPress={openMenu} style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={p.muted} />
        </Pressable>
      </View>

      {/* The post */}
      {post.has_photo ? (
        <Pressable accessible={false} onPress={onPostTap} onLongPress={openMenu} delayLongPress={400} style={[styles.photoBox, { backgroundColor: p.surface }]}>
          {photo.data ? (
            <Image source={{ uri: photo.data }} style={styles.photo} resizeMode="cover" accessibilityLabel="Photo in post" />
          ) : photo.isError ? (
            <View style={styles.photoState}>
              <Ionicons name="image-outline" size={32} color={p.muted} />
              <Text style={[styles.stateText, { color: p.muted }]}>Photo could not be loaded</Text>
            </View>
          ) : (
            <View style={styles.photoState}>
              <ActivityIndicator color={p.accent} size="large" />
            </View>
          )}
          <Animated.View pointerEvents="none" style={[styles.bigHeart, heartStyle]}>
            <Ionicons name="heart" size={96} color="#E34255" />
          </Animated.View>
        </Pressable>
      ) : post.body ? (
        <Pressable accessible={false} onPress={onPostTap} onLongPress={openMenu} delayLongPress={400} style={styles.textBox}>
          <Text style={[styles.textBody, { color: p.text }]}>{post.body}</Text>
          <Animated.View pointerEvents="none" style={[styles.bigHeart, heartStyle]}>
            <Ionicons name="heart" size={72} color="#E34255" />
          </Animated.View>
        </Pressable>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={post.kudoed ? 'Remove kudos' : 'Give kudos'} onPress={handleLike} onLongPress={handleKudosList} hitSlop={6} style={styles.action}>
          <Ionicons name={post.kudoed ? 'heart' : 'heart-outline'} size={24} color={post.kudoed ? '#E34255' : p.text} />
          <Text style={[styles.count, { color: post.kudoed ? '#E34255' : p.text }]}>{formatSocialCount(post.kudos_count)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Comments"
          onPress={() => {
            tapSelection();
            onComments?.(post);
          }}
          hitSlop={6}
          style={styles.action}>
          <Ionicons name="chatbubble-outline" size={22} color={p.text} />
          <Text style={[styles.count, { color: p.text }]}>{formatSocialCount(post.comments_count)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share"
          onPress={() => {
            tapSelection();
            onShare(post);
          }}
          hitSlop={6}
          style={styles.action}>
          <Ionicons name="paper-plane-outline" size={22} color={p.text} />
        </Pressable>
        <View style={styles.grow} />
        {post.is_mine ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={post.saved ? 'Saved' : 'Save'}
            onPress={() => {
              tapSelection();
              onSave?.(post);
            }}
            hitSlop={6}
            style={styles.action}>
            <Ionicons name={post.saved ? 'bookmark' : 'bookmark-outline'} size={22} color={post.saved ? p.accent : p.text} />
          </Pressable>
        )}
      </View>

      {/* The caption of a photo post */}
      {post.has_photo && post.body ? (
        <Text style={[styles.caption, { color: p.text }]}>
          <Text style={styles.captionHandle} onPress={() => onOpenProfile?.(post.handle)}>
            @{post.handle}{' '}
          </Text>
          {post.body}
        </Text>
      ) : null}

      {/* Tags */}
      {post.stamp || topic ? (
        <View style={styles.tags}>
          {post.stamp ? (
            <View style={[styles.tag, { backgroundColor: '#FEF3EB' }]}>
              <Ionicons name="flame" size={13} color="#E8762B" />
              <Text style={[styles.tagText, { color: '#B4530F' }]}>
                {post.stamp.streak}-day streak · {topicLabel(post.stamp.habit) ?? 'Habit'}
              </Text>
            </View>
          ) : null}
          {topic ? (
            <View style={[styles.tag, { backgroundColor: p.accentSoft }]}>
              <Text style={[styles.tagText, { color: p.accent }]}>#{topic}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', paddingTop: 14, paddingBottom: 12, gap: 12 },
  flush: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1, minWidth: 0 },
  names: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  sub: { fontSize: 12.5, fontWeight: '500' },
  moreBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  photoBox: { marginHorizontal: 12, borderRadius: 18, overflow: 'hidden', aspectRatio: 4 / 4.6, position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  stateText: { fontSize: 13 },
  bigHeart: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  textBox: { paddingHorizontal: 16, paddingVertical: 4, position: 'relative' },
  textBody: { fontSize: 17, lineHeight: 25, letterSpacing: -0.1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 6 },
  count: { fontSize: 14, fontWeight: '700' },
  grow: { flex: 1 },
  caption: { fontSize: 14.5, lineHeight: 21, paddingHorizontal: 16 },
  captionHandle: { fontWeight: '800' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 26, borderRadius: 13 },
  tagText: { fontSize: 12, fontWeight: '800' },
});
