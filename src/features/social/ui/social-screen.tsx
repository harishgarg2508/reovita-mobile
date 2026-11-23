import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryKeys } from '@shared/api';
import { tapSelection } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';
import {
  useMyHandle,
  useSocialFeed,
  useSocialUnread,
  SOCIAL_TOPICS,
} from '@entities/social';

import { socialProfileHref, socialRoute } from '../model/routes';
import { JoinPanel } from './join-panel';
import { PostFeed } from './post-feed';
import { SOCIAL_DOCK_SPACE, SocialDock } from './social-dock';

type Tab = 'for_you' | 'friends';


// The redesigned Social home:
// - Top bar houses community links: Quests, Pods, and Notifications
// - Sleek "Daily Pulse" habit bar: compact, motivating streak + habit check-in ribbon
// - Clean pill segmented switcher (For you | Friends) with an agile topic filter
// - Feed is immediately visible and breathing above the fold
export function SocialScreen() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const unread = useSocialUnread(me.joined);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('for_you');
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

  // Clean, uncluttered list header
  const header = (
    <View style={styles.headerWrap}>
      {/* 2. Feed Navigation: Segmented Switcher & Topic Filters */}
      <View style={styles.navRow}>
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
      </View>

      {/* 3. Streamlined Topic Filter Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topicsContainer}
        style={styles.topicScroll}>
        {[{ value: null, label: 'All' }, ...SOCIAL_TOPICS].map((t) => {
          const on = topic === t.value;
          return (
            <Pressable
              key={t.label}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => selectTopic(t.value)}
              style={[
                styles.topicPill,
                {
                  borderColor: on ? p.accent : p.border,
                  backgroundColor: on ? p.accentSoft : p.card,
                },
              ]}>
              <Text
                style={[
                  styles.topicPillText,
                  { color: on ? p.accent : p.muted },
                  on && styles.topicPillTextOn,
                ]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      {/* Top bar: back, the title, and the bell (activity: kudos, comments, requests, invitations). The rest of the actions are in the dock and in Move. */}
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
          {/* Notifications activity bell */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Activity"
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
    paddingBottom: 10,
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
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 4,
  },
  // 1. Daily Habit Pulse
  pulseCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  streakCount: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  progressText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  progressNumber: {
    fontWeight: '800',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  sheetHint: { fontSize: 13.5, lineHeight: 19 },
  habitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
    marginTop: 10,
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  habitChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  habitChipTextDone: {
    fontWeight: '700',
  },
  miniHabitScroll: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
    paddingTop: 8,
  },
  miniHabitRow: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  miniHabitDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  miniHabitLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  miniHabitLabelDone: {
    fontWeight: '700',
  },
  // 2. Feed Switcher
  navRow: {
    marginBottom: 8,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 22,
    padding: 3,
  },
  segmentPill: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
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
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    fontWeight: '700',
  },
  // 3. Topic Filters Carousel
  topicScroll: {
    marginBottom: 6,
  },
  topicsContainer: {
    gap: 7,
    paddingRight: 8,
  },
  topicPill: {
    paddingHorizontal: 13,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
  },
  topicPillText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  topicPillTextOn: {
    fontWeight: '800',
  },
  error: {
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
    fontSize: 14,
  },
});
