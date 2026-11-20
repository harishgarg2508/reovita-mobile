import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryKeys } from '@shared/api';
import { usePalette } from '@shared/ui/theme';
import { useMyHandle, useSocialFeed, useSocialUnread } from '@entities/social';

import { socialProfileHref, socialRoute } from '../model/routes';
import { JoinPanel } from './join-panel';
import { PostFeed } from './post-feed';
import { SOCIAL_DOCK_SPACE, SocialDock } from './social-dock';

type Tab = 'for_you' | 'friends';

// The social home. The top bar stays fixed (back to the dashboard, title, activity bell). Under it, one scrolling list: a segmented control with
// For you (public posts from everyone else) and Friends (the posts of my friends), then the posts, ten at a time with infinite scroll.
// Search, Post, Kudos and Profile are in the bottom dock. A person with no social account sees the create panel instead.
export function SocialScreen() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const unread = useSocialUnread(me.joined);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('for_you');
  // A tab always loads from the server: its list is emptied first, so its loader shows and no old posts are seen.
  const selectTab = (next: Tab) => {
    if (next !== tab) void queryClient.resetQueries({ queryKey: queryKeys.social.feedScope(next) });
    setTab(next);
  };

  // The page shows at once. While the handle is still being read, only the posts area shows its loading spinner.
  const forYou = useSocialFeed(me.joined && tab === 'for_you', 'for_you');
  const friends = useSocialFeed(me.joined && tab === 'friends', 'friends');

  const openProfile = (handle: string) => router.push(socialProfileHref(handle));

  // One bordered card with two equal segments and a line between them. The open segment is green and bold.
  const header = (
    <View style={[styles.segments, { backgroundColor: p.card, borderColor: p.border }]}>
      {(
        [
          ['for_you', 'For you'],
          ['friends', 'Friends'],
        ] as const
      ).map(([key, label], index) => (
        <View key={key} style={styles.segmentWrap}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: p.border }]} /> : null}
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => selectTab(key)} style={styles.segment}>
            <Text style={[styles.segmentText, { color: tab === key ? p.accent : p.muted }, tab === key && styles.segmentTextOn]}>{label}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => router.replace('/(app)/(tabs)/dashboard')} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Social</Text>
        <View style={styles.barEnd}>
          <Pressable accessibilityRole="button" accessibilityLabel="Social activity" hitSlop={8} onPress={() => router.push(socialRoute('/social/activity'))} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
            <Ionicons name="notifications-outline" size={19} color={p.text} />
            {(unread.data?.unread ?? 0) + (unread.data?.requests ?? 0) > 0 ? <View style={[styles.dot, { backgroundColor: p.red, borderColor: p.card }]} /> : null}
          </Pressable>
        </View>
      </View>

      {me.notJoined ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : me.isError ? (
        <Text style={[styles.error, { color: p.muted }]}>Could not open Social. Try again in a moment.</Text>
      ) : (
        <PostFeed
          query={tab === 'for_you' ? forYou : friends}
          header={header}
          emptyTitle={tab === 'friends' ? 'No posts from friends yet' : 'No new posts to show'}
          emptyBody={
            tab === 'friends'
              ? 'Posts from your friends show here. Find people with Search and send a friend request. Your own posts are on your Profile.'
              : 'Public posts from other people on Social will show here. Share a small win with the + button, and find friends with Search.'
          }
          onOpenProfile={openProfile}
          bottomPadding={insets.bottom + SOCIAL_DOCK_SPACE + 16}
        />
      )}

      <SocialDock active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  barEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  dot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  gutter: { paddingHorizontal: 16, paddingTop: 12 },
  segments: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 14 },
  segmentWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 22 },
  segment: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 15, fontWeight: '600' },
  segmentTextOn: { fontWeight: '800' },
  error: { textAlign: 'center', marginTop: 40, paddingHorizontal: 24, fontSize: 14 },
});
