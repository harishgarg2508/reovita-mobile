import { Ionicons } from '@expo/vector-icons';
import { memo, useRef } from 'react';
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

// The date of a post, like "Fri, 20 Nov 2026".
function postDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// One post in a feed: verified avatar, author info, circular more button, full portrait photo with
// a floating frosted glass action pill containing the like chip, comments, share, and bookmark.
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
  const bookmarked = post.saved;
  const name = post.display_name || `@${post.handle}`;

  const handleLike = () => {
    tapSelection();
    onKudos(post);
  };

  const handleShare = () => {
    tapSelection();
    onShare(post);
  };

  const handleBookmark = () => {
    tapSelection();
    onSave?.(post);
  };

  // Double tap on the post gives kudos, like other social apps. It only adds kudos (a second double tap never takes it back), and a heart pops up.
  const lastTap = useRef(0);
  const heart = useRef(new Animated.Value(0)).current;
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

  const handleComments = () => {
    tapSelection();
    onComments?.(post);
  };

  // Holding the like button on my own post shows who gave kudos (the comment button now opens the comments).
  const handleKudosList = () => {
    if (post.is_mine && onKudosList) {
      tapSelection();
      onKudosList(post);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }, flush && styles.flush]}>
      {/* Top Header */}
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          disabled={!onOpenProfile}
          onPress={() => onOpenProfile?.(post.handle)}
          style={styles.authorRow}>
          <View style={styles.avatarWrap}>
            <SocialAvatar handle={post.handle} hasAvatar={post.has_avatar} size={44} />
          </View>
          <View style={styles.names}>
            <Text numberOfLines={1} style={[styles.name, { color: p.text }]}>
              {name}
            </Text>
            <Text numberOfLines={1} style={styles.sub}>
              @{post.handle}
            </Text>
          </View>
        </Pressable>

        {/* Circular more button (...) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More options"
          hitSlop={8}
          onPress={() => onMenu(post)}
          style={[styles.moreBtn, { borderColor: p.text }]}>
          <Ionicons name="ellipsis-horizontal" size={15} color={p.text} />
        </Pressable>
      </View>

      {/* Media or Text Container */}
      {post.has_photo ? (
        <Pressable accessible={false} onPress={onPostTap} onLongPress={() => { tapSelection(); onMenu(post); }} delayLongPress={400} style={[styles.photoContainer, { backgroundColor: p.surface }]}>
          {photo.data ? (
            <Image source={{ uri: photo.data }} style={styles.photo} resizeMode="cover" accessibilityLabel="Photo in post" />
          ) : photo.isError ? (
            <View style={styles.photoFallback}>
              <Ionicons name="image-outline" size={32} color={p.muted} />
              <Text style={[styles.photoErrorText, { color: p.muted }]}>Photo could not be loaded</Text>
            </View>
          ) : (
            <View style={styles.photoLoading}>
              <ActivityIndicator color={p.accent} size="large" />
            </View>
          )}

          <Animated.View pointerEvents="none" style={[styles.bigHeart, heartStyle]}>
            <Ionicons name="heart" size={96} color="#E34255" />
          </Animated.View>

          {/* Floating Frosted Glass Action Bar */}
          <View
            style={[
              styles.floatingBar,
              {
                backgroundColor: p.text === '#FFFFFF' ? 'rgba(25, 22, 38, 0.78)' : 'rgba(255, 255, 255, 0.58)',
                borderColor: p.text === '#FFFFFF' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.75)',
              },
            ]}>
            {/* Left: Like button as solid white pill */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={post.kudoed ? 'Liked' : 'Like'}
              onPress={handleLike}
              onLongPress={handleKudosList}
              style={[
                styles.likePill,
                {
                  backgroundColor: p.text === '#FFFFFF' ? '#27233E' : '#FFFFFF',
                },
              ]}>
              <Ionicons
                name={post.kudoed ? 'heart' : 'heart-outline'}
                size={18}
                color={post.kudoed ? '#E34255' : (p.text === '#FFFFFF' ? '#FFFFFF' : '#1C1A24')}
              />
              <Text style={[styles.likeCount, { color: p.text === '#FFFFFF' ? '#FFFFFF' : '#1C1A24' }]}>
                {formatSocialCount(post.kudos_count)}
              </Text>
            </Pressable>

            {/* Comment / Kudos details button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Comments"
              onPress={handleComments}
              hitSlop={6}
              style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={19} color={p.text === '#FFFFFF' ? '#FFFFFF' : '#1C1A24'} />
              <Text style={[styles.actionCount, { color: p.text === '#FFFFFF' ? '#FFFFFF' : '#1C1A24' }]}>
                {formatSocialCount(post.comments_count)}
              </Text>
            </Pressable>

            {/* Share / Paper Plane */}
            <Pressable accessibilityRole="button" accessibilityLabel="Share" onPress={handleShare} hitSlop={6} style={styles.iconOnlyBtn}>
              <Ionicons name="paper-plane-outline" size={19} color={p.text === '#FFFFFF' ? '#FFFFFF' : '#1C1A24'} />
            </Pressable>

            {/* Bookmark / Ribbon */}
            {post.is_mine ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={bookmarked ? 'Saved' : 'Save'}
              onPress={handleBookmark}
              hitSlop={6}
              style={styles.iconOnlyBtn}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={19}
                color={bookmarked ? p.accent : (p.text === '#FFFFFF' ? '#FFFFFF' : '#1C1A24')}
              />
            </Pressable>
            )}
          </View>
        </Pressable>
      ) : (
        /* Text-only post with matching docked frosted bar */
        <Pressable accessible={false} onPress={onPostTap} onLongPress={() => { tapSelection(); onMenu(post); }} delayLongPress={400} style={[styles.textContainer, { backgroundColor: p.surface, borderColor: p.border }]}>
          {post.body ? <Text style={[styles.textBody, { color: p.text }]}>{post.body}</Text> : null}

          {/* Docked Action Bar */}
          <View
            style={[
              styles.dockedBar,
              {
                backgroundColor: p.card,
                borderColor: p.border,
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={post.kudoed ? 'Liked' : 'Like'}
              onPress={handleLike}
              onLongPress={handleKudosList}
              style={[
                styles.likePill,
                {
                  backgroundColor: p.text === '#FFFFFF' ? '#27233E' : p.surface,
                },
              ]}>
              <Ionicons
                name={post.kudoed ? 'heart' : 'heart-outline'}
                size={18}
                color={post.kudoed ? '#E34255' : (p.text === '#FFFFFF' ? '#FFFFFF' : '#1C1A24')}
              />
              <Text style={[styles.likeCount, { color: p.text === '#FFFFFF' ? '#FFFFFF' : '#1C1A24' }]}>
                {formatSocialCount(post.kudos_count)}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Comments"
              onPress={handleComments}
              hitSlop={6}
              style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={19} color={p.text} />
              <Text style={[styles.actionCount, { color: p.text }]}>{formatSocialCount(post.comments_count)}</Text>
            </Pressable>

            <Pressable accessibilityRole="button" accessibilityLabel="Share" onPress={handleShare} hitSlop={6} style={styles.iconOnlyBtn}>
              <Ionicons name="paper-plane-outline" size={19} color={p.text} />
            </Pressable>

            {post.is_mine ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={bookmarked ? 'Saved' : 'Save'}
              onPress={handleBookmark}
              hitSlop={6}
              style={styles.iconOnlyBtn}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={19}
                color={bookmarked ? p.accent : p.text}
              />
            </Pressable>
            )}
          </View>
          <Animated.View pointerEvents="none" style={[styles.bigHeart, heartStyle]}>
            <Ionicons name="heart" size={72} color="#E34255" />
          </Animated.View>
        </Pressable>
      )}

      {post.stamp ? (
        <View style={[styles.stamp, { backgroundColor: p.accentSoft }]}>
          <Ionicons name="flame" size={14} color="#E8762B" />
          <Text style={[styles.stampText, { color: p.text }]}>
            {post.stamp.streak}-day streak · {topicLabel(post.stamp.habit) ?? 'Habit'}
          </Text>
        </View>
      ) : null}

      {topicLabel(post.topic) ? (
        <View style={[styles.topicChip, { backgroundColor: p.accentSoft }]}>
          <Text style={[styles.topicText, { color: p.accent }]}>#{topicLabel(post.topic)}</Text>
        </View>
      ) : null}

      {/* Caption & Date when photo is present */}
      {post.has_photo && post.body ? (
        <View style={styles.captionBox}>
          <Text style={[styles.caption, { color: p.text }]}>
            <Text style={styles.captionHandle} onPress={() => onOpenProfile?.(post.handle)}>
              @{post.handle}{' '}
            </Text>
            {post.body}
          </Text>
          <Text style={[styles.dateText, { color: p.muted }]}>{postDate(post.created_at)}</Text>
        </View>
      ) : !post.has_photo ? (
        <Text style={[styles.dateTextStandalone, { color: p.muted }]}>{postDate(post.created_at)}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    // No padding on the card itself: the photo runs edge to edge. Only the header, caption and text areas have their own padding.
    overflow: 'hidden',
    paddingBottom: 14,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  flush: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
    minWidth: 0,
  },
  avatarWrap: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  names: {
    flex: 1,
    minWidth: 0,
    gap: 1.5,
  },
  name: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: 12.8,
    fontWeight: '500',
    color: '#8E8BA6',
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 4 / 4.4,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  bigHeart: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoErrorText: {
    fontSize: 13,
  },
  floatingBar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  likePill: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  likeCount: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    height: 40,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  iconOnlyBtn: {
    width: 38,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  textBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  dockedBar: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stamp: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 14, paddingHorizontal: 12, height: 30, borderRadius: 15 },
  stampText: { fontSize: 13, fontWeight: '800' },
  topicChip: { alignSelf: 'flex-start', marginHorizontal: 14, paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center' },
  topicText: { fontSize: 12.5, fontWeight: '700' },
  captionBox: {
    paddingHorizontal: 14,
    paddingTop: 2,
    gap: 4,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  captionHandle: {
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11.5,
    marginTop: 2,
  },
  dateTextStandalone: {
    fontSize: 11.5,
    paddingHorizontal: 14,
  },
});
