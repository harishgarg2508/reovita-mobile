import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryKeys } from '@shared/api';
import { tapSelection } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_RULE, SOCIAL_SPACE, SOCIAL_TYPE, SOCIAL_TOPICS, useMyHandle, useSocialFeed, useSocialUnread } from '@entities/social';

import { socialProfileHref, socialRoute } from '../model/routes';
import { JoinPanel } from './join-panel';
import { PostFeed } from './post-feed';
import { SOCIAL_DOCK_SPACE, SocialDock } from './social-dock';

type Tab = 'for_you' | 'friends';

// The Social home, in the editorial system (see social-system.ts): a plain bar, one large heading, two text tabs on a rule, a row of topics, then the feed
// as flat posts. The check-in, quests, pods and journeys live in Move; the bell opens Activity.
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
  const waiting = (unread.data?.unread ?? 0) + (unread.data?.requests ?? 0);

  const header = (
    <View style={styles.headerWrap}>
      {/* Two text tabs on a rule: the active one is dark with a green line under it */}
      <View style={[styles.tabs, { borderBottomColor: p.border }]}>
        {(
          [
            ['for_you', 'For you'],
            ['friends', 'Friends'],
          ] as const
        ).map(([key, label]) => {
          const active = tab === key;
          return (
            <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => selectTab(key)} style={[styles.tab, active && { borderBottomColor: p.accent }]}>
              <Text style={[SOCIAL_TYPE.bodyStrong, { color: active ? p.text : p.muted }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Topics: plain text, the chosen one filled */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topics}>
        {[{ value: null, label: 'All' }, ...SOCIAL_TOPICS].map((t) => {
          const on = topic === t.value;
          return (
            <Pressable key={t.label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => selectTopic(t.value)} style={[styles.topic, on && { backgroundColor: p.accent }]}>
              <Text style={[SOCIAL_TYPE.label, { color: on ? '#FFFFFF' : p.muted }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 4 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => router.replace('/(app)/(tabs)/dashboard')} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={p.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={waiting > 0 ? `Activity, ${waiting} new` : 'Activity'} hitSlop={10} onPress={() => router.push(socialRoute('/social/activity'))} style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={23} color={p.text} />
          {waiting > 0 ? (
            <View style={[styles.count, { backgroundColor: p.red }]}>
              <Text style={styles.countText}>{waiting > 9 ? '9+' : waiting}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <Text style={[SOCIAL_TYPE.display, styles.heading, { color: p.text }]}>Social</Text>

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : me.isError ? (
        <Text style={[SOCIAL_TYPE.body, styles.error, { color: p.muted }]}>Could not open Social. Try again in a moment.</Text>
      ) : (
        <PostFeed
          query={tab === 'for_you' ? forYou : friends}
          header={header}
          fullWidth
          emptyTitle={tab === 'friends' ? 'No posts from friends yet' : 'No new posts to show'}
          emptyBody={
            tab === 'friends'
              ? 'Posts from your friends show here. Find people in Explore and send a friend request. Your own posts are on your Profile.'
              : 'Public posts from other people on Social will show here. Share a small win with the + button, and find friends in Explore.'
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
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SOCIAL_SPACE.edge - 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', top: 6, right: 4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
  heading: { paddingHorizontal: SOCIAL_SPACE.edge, paddingBottom: SOCIAL_SPACE.inner },
  gutter: { flex: 1, paddingHorizontal: SOCIAL_SPACE.edge, paddingTop: SOCIAL_SPACE.inner },
  headerWrap: { paddingBottom: SOCIAL_SPACE.inner, gap: SOCIAL_SPACE.inner },
  tabs: { flexDirection: 'row', gap: 28, paddingHorizontal: SOCIAL_SPACE.edge, borderBottomWidth: SOCIAL_RULE },
  tab: { paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -StyleSheet.hairlineWidth },
  topics: { gap: 8, paddingHorizontal: SOCIAL_SPACE.edge },
  topic: { height: 32, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  error: { textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
});
