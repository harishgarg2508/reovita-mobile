import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { SocialAvatar, useMyHandle, useSocialLeaderboard, useSocialQuests } from '@entities/social';

import { SOCIAL_HOME, socialProfileHref } from '../model/routes';
import { JoinPanel } from './join-panel';
import { useScrollToTopOnFocus } from '@shared/lib';

// Quests and the leaderboard. Quests: the goals of this month. Everyone is in all of them, progress comes from the person's own habit check-ins, and
// reaching a goal puts a badge on their profile. Leaderboard: only the person and their friends, ranked by days with a check-in this week or this
// month, so nobody is compared with strangers and no habit is shown.
export function QuestsScreen() {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const quests = useSocialQuests(me.joined);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const board = useSocialLeaderboard(period, me.joined);

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => goBackOr(router, SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Quests</Text>
        <View style={styles.spacer} />
      </View>

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHead}>
            <Text style={[styles.section, { color: p.text }]}>This month</Text>
            {quests.data ? (
              <Text style={[styles.sectionHint, { color: p.muted }]}>
                {quests.data.completed_count} done · {quests.data.days_left} {quests.data.days_left === 1 ? 'day' : 'days'} left
              </Text>
            ) : null}
          </View>

          {quests.isPending ? <ActivityIndicator color={p.accent} style={{ marginVertical: 24 }} /> : null}
          {quests.isError ? <Text style={[styles.note, { color: p.muted }]}>Could not load the quests. Try again in a moment.</Text> : null}
          {quests.data?.quests.map((quest) => (
            <View key={quest.key} style={[styles.quest, { backgroundColor: p.card, borderColor: quest.completed ? p.accent : p.border }]}>
              <View style={styles.questTop}>
                <Text style={[styles.questTitle, { color: p.text }]}>{quest.title}</Text>
                {quest.completed ? (
                  <View style={styles.doneRow}>
                    <Ionicons name="ribbon" size={15} color={p.accent} />
                    <Text style={[styles.doneText, { color: p.accent }]}>Done</Text>
                  </View>
                ) : (
                  <Text style={[styles.questCount, { color: p.muted }]}>
                    {quest.progress}/{quest.goal}
                  </Text>
                )}
              </View>
              <View style={[styles.track, { backgroundColor: p.border }]}>
                <View style={[styles.fill, { backgroundColor: p.accent, width: `${Math.round((quest.progress / quest.goal) * 100)}%` }]} />
              </View>
            </View>
          ))}

          <View style={[styles.sectionHead, { marginTop: 18 }]}>
            <Text style={[styles.section, { color: p.text }]}>Friends leaderboard</Text>
            <View style={[styles.switch, { backgroundColor: p.surface, borderColor: p.border }]}>
              {(['week', 'month'] as const).map((key) => (
                <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: period === key }} onPress={() => setPeriod(key)} style={[styles.switchItem, period === key && { backgroundColor: p.card }]}>
                  <Text style={[styles.switchText, { color: period === key ? p.text : p.muted }]}>{key === 'week' ? 'Week' : 'Month'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={[styles.note, { color: p.muted, textAlign: 'left', marginBottom: 8 }]}>Days with a check-in. Only you and your friends.</Text>

          {board.isPending ? <ActivityIndicator color={p.accent} style={{ marginVertical: 24 }} /> : null}
          {board.isError ? <Text style={[styles.note, { color: p.muted }]}>Could not load the leaderboard.</Text> : null}
          {board.data?.items.length === 1 ? <Text style={[styles.note, { color: p.muted }]}>Add friends to compete with them. Find people with Search.</Text> : null}
          {board.data?.items.map((entry) => (
            <Pressable
              key={entry.handle}
              accessibilityRole="button"
              onPress={() => router.push(socialProfileHref(entry.handle))}
              style={[styles.entry, { backgroundColor: entry.is_me ? p.accentSoft : p.card, borderColor: p.border }]}>
              <Text style={[styles.rank, { color: entry.rank === 1 ? '#E8762B' : p.muted }]}>{entry.rank}</Text>
              <SocialAvatar handle={entry.handle} hasAvatar={entry.has_avatar} size={38} />
              <Text numberOfLines={1} style={[styles.entryName, { color: p.text }]}>
                {entry.is_me ? 'You' : entry.display_name || `@${entry.handle}`}
              </Text>
              <Text style={[styles.entryDays, { color: p.text }]}>
                {entry.active_days} <Text style={[styles.entryUnit, { color: p.muted }]}>{entry.active_days === 1 ? 'day' : 'days'}</Text>
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontWeight: '800' },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: 16, fontWeight: '800' },
  sectionHint: { fontSize: 12.5 },
  note: { fontSize: 13, textAlign: 'center', marginVertical: 6 },
  quest: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  questTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questTitle: { fontSize: 14.5, fontWeight: '700' },
  questCount: { fontSize: 13, fontWeight: '700' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneText: { fontSize: 13, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  switch: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 2 },
  switchItem: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center' },
  switchText: { fontSize: 12.5, fontWeight: '700' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  rank: { width: 22, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  entryName: { flex: 1, fontSize: 15, fontWeight: '700' },
  entryDays: { fontSize: 16, fontWeight: '800' },
  entryUnit: { fontSize: 12, fontWeight: '600' },
});
