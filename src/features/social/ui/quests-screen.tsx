import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_RULE, SOCIAL_SPACE, SOCIAL_TYPE, SocialAvatar, useMyHandle, useSocialLeaderboard, useSocialQuests } from '@entities/social';

import { SOCIAL_HOME, socialProfileHref } from '../model/routes';
import { JoinPanel } from './join-panel';
import { tapSelection, useScrollToTopOnFocus } from '@shared/lib';
import { FeatureHelpButton } from './feature-help';

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
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => goBackOr(router, SOCIAL_HOME)} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={p.text} />
        </Pressable>
        <View style={styles.iconBtn} />
      </View>
      <View style={styles.heading}>
        <View style={styles.headingRow}>
          <Text style={[SOCIAL_TYPE.display, { color: p.text, flexShrink: 1 }]}>Quests & Leaderboard</Text>
          <FeatureHelpButton topic="quests" />
        </View>
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
              <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>Monthly quests</Text>
              <Text style={[SOCIAL_TYPE.small, { color: p.muted }]}>Build lifelong consistency</Text>
            </View>
            {quests.data ? (
              <View style={styles.questMeta}>
                <Text style={[SOCIAL_TYPE.label, { color: p.text }]}>{quests.data.completed_count} done</Text>
                <Text style={[SOCIAL_TYPE.small, { color: p.muted }]}>{quests.data.days_left} days left</Text>
              </View>
            ) : null}
          </View>

          {quests.isPending ? <ActivityIndicator color={p.accent} style={{ marginVertical: 24 }} /> : null}
          {quests.isError ? <Text style={[styles.note, { color: p.muted }]}>Could not load the quests. Try again in a moment.</Text> : null}
          {quests.data?.quests.map((quest) => {
            const pct = Math.min(100, Math.round((quest.progress / Math.max(quest.goal, 1)) * 100));
            const iconName = getQuestIcon(quest.key);
            return (
              <View key={quest.key} style={[styles.quest, { borderBottomColor: p.border }]}>
                <View style={styles.questTop}>
                  <Ionicons name={iconName} size={20} color={quest.completed ? p.accent : p.muted} />
                  <View style={styles.questDetails}>
                    <Text style={[SOCIAL_TYPE.bodyStrong, { color: p.text }]}>{quest.title}</Text>
                    <Text style={[SOCIAL_TYPE.small, { color: p.muted }]}>
                      {quest.completed ? 'Goal reached this month' : `${quest.goal - quest.progress} check-ins remaining`}
                    </Text>
                  </View>
                  {quest.completed ? (
                    <View style={styles.doneRow}>
                      <Ionicons name="checkmark-circle" size={16} color={p.accent} />
                      <Text style={[SOCIAL_TYPE.label, { color: p.accent }]}>Done</Text>
                    </View>
                  ) : (
                    <Text style={[SOCIAL_TYPE.bodyStrong, { color: p.text }]}>{pct}%</Text>
                  )}
                </View>
                <View style={[styles.track, { backgroundColor: p.border }]}>
                  <View style={[styles.fill, { backgroundColor: p.accent, width: `${pct}%` }]} />
                </View>
                <Text style={[SOCIAL_TYPE.small, styles.ratio, { color: p.muted }]}>
                  {quest.progress} of {quest.goal} days
                </Text>
              </View>
            );
          })}

          {/* Friends Leaderboard Section */}
          <View style={[styles.sectionHead, { marginTop: 20 }]}>
            <View>
              <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>Friends leaderboard</Text>
              <Text style={[SOCIAL_TYPE.small, { color: p.muted }]}>Ranked by active check-in days</Text>
            </View>
            <View style={styles.switch}>
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
                    style={[styles.switchItem, active && { borderBottomColor: p.accent }]}>
                    <Text style={[SOCIAL_TYPE.label, { color: active ? p.text : p.muted }]}>{key === 'week' ? 'Week' : 'Month'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {board.isPending ? <ActivityIndicator color={p.accent} style={{ marginVertical: 24 }} /> : null}
          {board.isError ? <Text style={[styles.note, { color: p.muted }]}>Could not load the leaderboard.</Text> : null}
          {board.data?.items.length === 1 ? (
            <View style={styles.soloCard}>
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
                style={[styles.entry, { borderBottomColor: p.border, backgroundColor: entry.is_me ? p.accentSoft : 'transparent' }]}>
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
                    <Text numberOfLines={1} style={[SOCIAL_TYPE.bodyStrong, { color: p.text }]}>
                      {entry.is_me ? 'You' : entry.display_name || `@${entry.handle}`}
                    </Text>
                  </View>
                  <Text style={[SOCIAL_TYPE.small, { color: p.muted }]}>@{entry.handle}</Text>
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
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { paddingHorizontal: SOCIAL_SPACE.edge, paddingBottom: SOCIAL_SPACE.inner, gap: 2 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SOCIAL_SPACE.inner },
  questMeta: { alignItems: 'flex-end', gap: 1 },
  note: { fontSize: 13, textAlign: 'center', marginVertical: 6 },
  quest: { borderBottomWidth: SOCIAL_RULE, paddingVertical: 16, gap: 10 },
  questTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  questDetails: { flex: 1, minWidth: 0, gap: 1 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  ratio: { textAlign: 'right' },
  switch: { flexDirection: 'row', gap: 18 },
  switchItem: { paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  soloCard: { paddingVertical: 16, gap: 6 },
  soloTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15.5 },
  soloBody: { fontSize: 13.5, lineHeight: 20 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: SOCIAL_RULE, paddingHorizontal: 4, paddingVertical: 14 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankBadgeMedal: { borderWidth: 1 },
  rankText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  entryInfo: { flex: 1, minWidth: 0, gap: 1 },
  entryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entryScore: { alignItems: 'flex-end', gap: 1 },
  entryDaysRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  entryDays: { fontFamily: 'Poppins_600SemiBold', fontSize: 17 },
  entryUnit: { fontSize: 11.5 },
});
