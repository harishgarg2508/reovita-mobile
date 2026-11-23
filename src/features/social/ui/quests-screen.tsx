import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_SPACE, SOCIAL_TYPE, SocialAvatar, useMyHandle, useSocialLeaderboard, useSocialQuests } from '@entities/social';

import { SOCIAL_HOME, socialProfileHref } from '../model/routes';
import { JoinPanel } from './join-panel';
import { tapSelection, useScrollToTopOnFocus } from '@shared/lib';

function getQuestIcon(key: string): keyof typeof Ionicons.glyphMap {
  const lower = key.toLowerCase();
  if (lower.includes('step')) return 'footsteps';
  if (lower.includes('sleep')) return 'moon';
  if (lower.includes('water') || lower.includes('hydrat')) return 'water';
  if (lower.includes('strength') || lower.includes('barbell')) return 'barbell';
  if (lower.includes('mindful') || lower.includes('zen')) return 'leaf';
  return 'trophy';
}

function getRankBadge(rank: number, p: ReturnType<typeof usePalette>) {
  if (rank === 1) {
    return {
      bg: 'rgba(245, 158, 11, 0.15)',
      text: '#F59E0B',
      border: 'rgba(245, 158, 11, 0.35)',
      icon: 'trophy' as const,
    };
  }
  if (rank === 2) {
    return {
      bg: 'rgba(148, 163, 184, 0.15)',
      text: '#94A3B8',
      border: 'rgba(148, 163, 184, 0.35)',
      icon: 'medal' as const,
    };
  }
  if (rank === 3) {
    return {
      bg: 'rgba(217, 119, 6, 0.15)',
      text: '#D97706',
      border: 'rgba(217, 119, 6, 0.35)',
      icon: 'medal-outline' as const,
    };
  }
  return {
    bg: 'transparent',
    text: p.muted,
    border: 'transparent',
    icon: null,
  };
}

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
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 4 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => goBackOr(router, SOCIAL_HOME)} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={p.text} />
        </Pressable>
        <View style={styles.iconBtn} />
      </View>
      <View style={styles.heading}>
        <Text style={[SOCIAL_TYPE.display, { color: p.text }]}>Quests & Leaderboard</Text>
      </View>

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {/* Monthly Quests Section */}
          <View style={styles.sectionHead}>
            <View>
              <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>Monthly Quests</Text>
              <Text style={[styles.sectionSub, { color: p.muted }]}>Build lifelong consistency</Text>
            </View>
            {quests.data ? (
              <View style={[styles.questMetaPill, { backgroundColor: p.surface, borderColor: p.border }]}>
                <Ionicons name="sparkles" size={12} color={p.accent} />
                <Text style={[styles.sectionHint, { color: p.text }]}>
                  {quests.data.completed_count} done · {quests.data.days_left}d left
                </Text>
              </View>
            ) : null}
          </View>

          {quests.isPending ? <ActivityIndicator color={p.accent} style={{ marginVertical: 24 }} /> : null}
          {quests.isError ? <Text style={[styles.note, { color: p.muted }]}>Could not load the quests. Try again in a moment.</Text> : null}
          {quests.data?.quests.map((quest) => {
            const pct = Math.min(100, Math.round((quest.progress / Math.max(quest.goal, 1)) * 100));
            const iconName = getQuestIcon(quest.key);
            return (
              <View key={quest.key} style={[styles.quest, { backgroundColor: p.card, borderColor: quest.completed ? p.accent : p.border }]}>
                <View style={styles.questTop}>
                  <View style={[styles.questIconBox, { backgroundColor: quest.completed ? p.accentSoft : p.surface }]}>
                    <Ionicons name={iconName} size={20} color={quest.completed ? p.accent : p.text} />
                  </View>

                  <View style={styles.questDetails}>
                    <Text style={[styles.questTitle, { color: p.text }]}>{quest.title}</Text>
                    <Text style={[styles.questGoalText, { color: p.muted }]}>
                      {quest.completed ? 'Goal reached this month' : `${quest.goal - quest.progress} check-ins remaining`}
                    </Text>
                  </View>

                  {quest.completed ? (
                    <View style={[styles.doneBadge, { backgroundColor: p.accentSoft }]}>
                      <Ionicons name="ribbon" size={14} color={p.accent} />
                      <Text style={[styles.doneText, { color: p.accent }]}>Completed</Text>
                    </View>
                  ) : (
                    <Text style={[styles.questPct, { color: p.text }]}>
                      {pct}%
                    </Text>
                  )}
                </View>

                {/* Progress Bar & Subtext */}
                <View style={styles.trackContainer}>
                  <View style={[styles.track, { backgroundColor: p.border }]}>
                    <View style={[styles.fill, { backgroundColor: quest.completed ? p.accent : p.accent, width: `${pct}%` }]} />
                  </View>
                  <View style={styles.trackMeta}>
                    <Text style={[styles.trackRatio, { color: p.muted }]}>
                      {quest.progress} / {quest.goal} days
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Friends Leaderboard Section */}
          <View style={[styles.sectionHead, { marginTop: 20 }]}>
            <View>
              <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>Friends Leaderboard</Text>
              <Text style={[styles.sectionSub, { color: p.muted }]}>Ranked by active check-in days</Text>
            </View>
            <View style={[styles.switch, { backgroundColor: p.surface, borderColor: p.border }]}>
              {(['week', 'month'] as const).map((key) => {
                const active = period === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      tapSelection();
                      setPeriod(key);
                    }}
                    style={[styles.switchItem, active && [styles.switchItemActive, { backgroundColor: p.card }]]}>
                    <Text style={[styles.switchText, { color: active ? p.text : p.muted }]}>
                      {key === 'week' ? 'Week' : 'Month'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {board.isPending ? <ActivityIndicator color={p.accent} style={{ marginVertical: 24 }} /> : null}
          {board.isError ? <Text style={[styles.note, { color: p.muted }]}>Could not load the leaderboard.</Text> : null}
          {board.data?.items.length === 1 ? (
            <View style={[styles.soloCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <Ionicons name="people-outline" size={24} color={p.accent} />
              <Text style={[styles.soloTitle, { color: p.text }]}>Compete with Friends</Text>
              <Text style={[styles.soloBody, { color: p.muted }]}>
                Add friends to keep each other accountable and see your weekly rank here.
              </Text>
            </View>
          ) : null}

          {board.data?.items.map((entry) => {
            const badge = getRankBadge(entry.rank, p);
            return (
              <Pressable
                key={entry.handle}
                accessibilityRole="button"
                onPress={() => router.push(socialProfileHref(entry.handle))}
                style={[
                  styles.entry,
                  {
                    backgroundColor: entry.is_me ? p.accentSoft : p.card,
                    borderColor: entry.is_me ? p.accent : p.border,
                  },
                ]}>
                {/* Rank Badge */}
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: badge.bg, borderColor: badge.border },
                    badge.icon ? styles.rankBadgeMedal : null,
                  ]}>
                  {badge.icon ? (
                    <Ionicons name={badge.icon} size={15} color={badge.text} />
                  ) : (
                    <Text style={[styles.rankText, { color: badge.text }]}>{entry.rank}</Text>
                  )}
                </View>

                <SocialAvatar handle={entry.handle} hasAvatar={entry.has_avatar} size={40} />

                <View style={styles.entryInfo}>
                  <View style={styles.entryNameRow}>
                    <Text numberOfLines={1} style={[styles.entryName, { color: p.text }]}>
                      {entry.is_me ? 'You' : entry.display_name || `@${entry.handle}`}
                    </Text>
                    {entry.is_me ? (
                      <View style={[styles.youBadge, { backgroundColor: p.accent }]}>
                        <Text style={styles.youBadgeText}>YOU</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.entryHandle, { color: p.muted }]}>@{entry.handle}</Text>
                </View>

                {/* Metric Display */}
                <View style={styles.entryScore}>
                  <View style={styles.entryDaysRow}>
                    <Ionicons name="flame" size={15} color="#E8762B" />
                    <Text style={[styles.entryDays, { color: p.text }]}>
                      {entry.active_days}
                    </Text>
                  </View>
                  <Text style={[styles.entryUnit, { color: p.muted }]}>
                    {entry.active_days === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SOCIAL_SPACE.edge - 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { paddingHorizontal: SOCIAL_SPACE.edge, paddingBottom: SOCIAL_SPACE.inner, gap: 2 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontWeight: '800' },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12.5, fontWeight: '500', marginTop: 1 },
  questMetaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  sectionHint: { fontSize: 12, fontWeight: '700' },
  note: { fontSize: 13, textAlign: 'center', marginVertical: 6 },
  quest: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 12 },
  questTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  questIconBox: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  questDetails: { flex: 1, minWidth: 0, gap: 2 },
  questTitle: { fontSize: 15, fontWeight: '700' },
  questGoalText: { fontSize: 12, fontWeight: '500' },
  questPct: { fontSize: 15, fontWeight: '800' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  doneText: { fontSize: 12, fontWeight: '800' },
  trackContainer: { gap: 6 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  trackMeta: { flexDirection: 'row', justifyContent: 'flex-end' },
  trackRatio: { fontSize: 11.5, fontWeight: '600' },
  switch: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, padding: 3 },
  switchItem: { paddingHorizontal: 14, height: 30, borderRadius: 15, justifyContent: 'center' },
  switchItemActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  switchText: { fontSize: 12.5, fontWeight: '700' },
  soloCard: { borderWidth: 1, borderRadius: 18, padding: 20, alignItems: 'center', gap: 6, marginVertical: 6 },
  soloTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  soloBody: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankBadgeMedal: { borderWidth: 1 },
  rankText: { fontSize: 15, fontWeight: '800' },
  entryInfo: { flex: 1, minWidth: 0, gap: 1 },
  entryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entryName: { fontSize: 15, fontWeight: '700' },
  youBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  youBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  entryHandle: { fontSize: 12, fontWeight: '500' },
  entryScore: { alignItems: 'flex-end', gap: 1 },
  entryDaysRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  entryDays: { fontSize: 17, fontWeight: '800' },
  entryUnit: { fontSize: 11.5, fontWeight: '600' },
});
