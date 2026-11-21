import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryKeys } from '@shared/api';
import { tapSelection } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';
import { useMyHandle, useSocialFeed, useSocialUnread, SOCIAL_TOPICS, useTodayCheckIns } from '@entities/social';

import { socialProfileHref, socialRoute } from '../model/routes';
import { useToggleCheckIn } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { PostFeed } from './post-feed';
import { SOCIAL_DOCK_SPACE, SocialDock } from './social-dock';

type Tab = 'for_you' | 'friends';

// The social home with "For you" (public posts) and "Friends" (posts from friends).
// Sleek top bar, refined pill-segmented switcher, and modern feed cards.
export function SocialScreen() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const unread = useSocialUnread(me.joined);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('for_you');
  const today = useTodayCheckIns(me.joined);
  const checkIn = useToggleCheckIn();
  // A topic filter for both feeds. Tapping the chosen topic again (or All) shows every post.
  const [topic, setTopic] = useState<string | null>(null);

  const selectTab = (next: Tab) => {
    if (next !== tab) {
      tapSelection();
      void queryClient.resetQueries({ queryKey: queryKeys.social.feedScope(next) });
      setTab(next);
    }
  };

  const forYou = useSocialFeed(me.joined && tab === 'for_you', 'for_you', topic);
  const friends = useSocialFeed(me.joined && tab === 'friends', 'friends', topic);

  const selectTopic = (next: string | null) => {
    if (next === topic) return;
    tapSelection();
    void queryClient.resetQueries({ queryKey: queryKeys.social.feedScope(tab, next) });
    setTopic(next);
  };

  const openProfile = (handle: string) => router.push(socialProfileHref(handle));

  // Sleek segmented pill switcher for For you / Friends
  const header = (
    <View>
      {/* Today: tap a habit to check in, tap it again to take it back. The streak counts the days in a row with at least one check-in. */}
      <View style={[styles.todayCard, { backgroundColor: p.card, borderColor: p.border }]}>
        <View style={styles.todayTop}>
          <Text style={[styles.todayTitle, { color: p.text }]}>Today</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Quests and leaderboard" onPress={() => router.push(socialRoute('/social/quests'))} hitSlop={8} style={styles.questsLink}>
            <Ionicons name="trophy-outline" size={14} color={p.accent} />
            <Text style={[styles.questsLinkText, { color: p.accent }]}>Quests</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Accountability pods" onPress={() => router.push(socialRoute('/social/pods'))} hitSlop={8} style={styles.podsLink}>
            <Ionicons name="people-circle-outline" size={15} color={p.accent} />
            <Text style={[styles.questsLinkText, { color: p.accent }]}>Pods</Text>
          </Pressable>
          <View style={styles.streakRow}>
            <Ionicons name="flame" size={16} color={(today.data?.streak ?? 0) > 0 ? '#E8762B' : p.muted} />
            <Text style={[styles.streakText, { color: p.text }]}>{today.data?.streak ?? 0}-day streak</Text>
          </View>
        </View>
        <View style={styles.habitRow}>
          {SOCIAL_TOPICS.map((t) => {
            const done = today.data?.habits.includes(t.value) ?? false;
            return (
              <Pressable
                key={t.value}
                accessibilityRole="button"
                accessibilityState={{ selected: done }}
                disabled={checkIn.isPending || today.isPending}
                onPress={() => {
                  tapSelection();
                  checkIn.mutate({ habit: t.value, on: !done });
                }}
                style={[styles.habitPill, { borderColor: done ? p.accent : p.border, backgroundColor: done ? p.accentSoft : 'transparent' }]}>
                {done ? <Ionicons name="checkmark" size={13} color={p.accent} /> : null}
                <Text style={[styles.habitText, { color: done ? p.accent : p.muted }, done && styles.topicPillTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

    <View style={[styles.segmentTrack, { backgroundColor: p.surface, borderColor: p.border }]}>
      {(
        [
          ['for_you', 'For you'],
          ['friends', 'Friends'],
        ] as const
      ).map(([key, label]) => {
        const active = tab === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => selectTab(key)}
            style={[
              styles.segmentPill,
              active && [
                styles.segmentPillActive,
                {
                  backgroundColor: p.card,
                  borderColor: p.border,
                },
              ],
            ]}>
            <Text
              style={[
                styles.segmentText,
                { color: active ? p.text : p.muted },
                active && styles.segmentTextActive,
              ]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topics} style={styles.topicScroll}>
        {[{ value: null, label: 'All' }, ...SOCIAL_TOPICS].map((t) => {
          const on = topic === t.value;
          return (
            <Pressable key={t.label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => selectTopic(t.value)} style={[styles.topicPill, { borderColor: on ? p.accent : p.border, backgroundColor: on ? p.accentSoft : p.card }]}>
              <Text style={[styles.topicPillText, { color: on ? p.accent : p.muted }, on && styles.topicPillTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      {/* Top Header Bar */}
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={() => router.replace('/(app)/(tabs)/dashboard')}
          style={[styles.roundBtn, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Social</Text>
        <View style={styles.barEnd}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Social activity"
            hitSlop={8}
            onPress={() => router.push(socialRoute('/social/activity'))}
            style={[styles.roundBtn, { backgroundColor: p.card, borderColor: p.border }]}>
            <Ionicons name="notifications-outline" size={19} color={p.text} />
            {(unread.data?.unread ?? 0) + (unread.data?.requests ?? 0) > 0 ? (
              <View style={[styles.dot, { backgroundColor: p.red, borderColor: p.card }]} />
            ) : null}
          </Pressable>
        </View>
      </View>

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : me.isError ? (
        <Text style={[styles.error, { color: p.muted }]}>Could not open Social. Try again in a moment.</Text>
      ) : (
        <PostFeed
          query={tab === 'for_you' ? forYou : friends}
          header={header}
          fullWidth
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
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  barEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  dot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  segmentTrack: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
  },
  segmentPill: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  segmentPillActive: {
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  segmentTextActive: {
    fontWeight: '700',
  },
  todayCard: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12, gap: 10 },
  todayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questsLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 'auto', marginLeft: 12 },
  podsLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 'auto', marginLeft: 12 },
  questsLinkText: { fontSize: 13, fontWeight: '800' },
  todayTitle: { fontSize: 15, fontWeight: '800' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontSize: 13, fontWeight: '800' },
  habitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  habitPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 30, borderRadius: 15, borderWidth: 1 },
  habitText: { fontSize: 12.5, fontWeight: '600' },
  topicScroll: { marginBottom: 14, marginTop: 10 },
  topics: { gap: 8, paddingRight: 8 },
  topicPill: { paddingHorizontal: 14, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: 'center' },
  topicPillText: { fontSize: 13, fontWeight: '600' },
  topicPillTextOn: { fontWeight: '800' },
  error: { textAlign: 'center', marginTop: 40, paddingHorizontal: 24, fontSize: 14 },
});
