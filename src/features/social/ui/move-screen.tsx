import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapSelection, useScrollToTopOnFocus } from '@shared/lib';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_RULE, SOCIAL_SPACE, SOCIAL_TOPICS, SOCIAL_TYPE, useJourneys, useMyHandle, useSocialPods, useSocialQuests, useTodayCheckIns } from '@entities/social';

import { SOCIAL_HOME, socialRoute } from '../model/routes';
import { useToggleCheckIn } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { SOCIAL_DOCK_SPACE, SocialDock } from './social-dock';
import { StepsBanner } from './steps-banner';
import { StepsCard } from './steps-card';

const HABIT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  sleep: 'moon-outline',
  daily_steps: 'footsteps-outline',
  nutrition: 'nutrition-outline',
  hydration: 'water-outline',
  mindfulness: 'leaf-outline',
  strength: 'barbell-outline',
  yoga: 'body-outline',
  recovery: 'heart-circle-outline',
};

// The Move tab, in the editorial system (see social-system.ts). One large heading, then today: the streak as a big figure, the habits as a row of marks, and
// the one action, Check in. Under it the steps card, and a plain list of the three things you do over time: Journeys, Pods and Quests, each with one line
// of where you stand. The list is rows on thin rules, not boxes.
export function MoveScreen() {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const today = useTodayCheckIns(me.joined);
  const checkIn = useToggleCheckIn();
  const journeys = useJourneys(me.joined);
  const pods = useSocialPods(me.joined);
  const quests = useSocialQuests(me.joined);
  const [habitsOpen, setHabitsOpen] = useState(false);

  const streak = today.data?.streak ?? 0;
  const completed = today.data?.habits ?? [];
  const running = (journeys.data ?? []).filter((j) => j.status === 'active');
  const best = running.reduce((top, j) => Math.max(top, j.my_percent), 0);
  const podStreak = (pods.data ?? []).reduce((top, pod) => Math.max(top, pod.streak_weeks), 0);

  const rows: { title: string; line: string; href: string }[] = [
    {
      title: 'Journeys',
      line: running.length > 0 ? `${running.length} on the road, your best is ${Math.round(best)}% along` : 'Walk a route with friends on a 3D map',
      href: '/social/journeys',
    },
    {
      title: 'Pods',
      line: (pods.data?.length ?? 0) > 0 ? `${pods.data?.length} ${pods.data?.length === 1 ? 'pod' : 'pods'}, best streak ${podStreak} ${podStreak === 1 ? 'week' : 'weeks'}` : 'A small private group with a weekly target',
      href: '/social/pods',
    },
    {
      title: 'Quests and leaderboard',
      line: quests.data ? `${quests.data.completed_count} done this month, ${quests.data.days_left} days left` : 'Monthly goals and your friends ranked',
      href: '/social/quests',
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} // Move is a tab of Social: the dock replaces screens instead of stacking them, so Back goes to the Social home, not to what was open before Social.
          onPress={() => router.replace(SOCIAL_HOME)} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={p.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Social settings" hitSlop={10} onPress={() => router.push(socialRoute('/social/settings'))} style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={22} color={p.text} />
        </Pressable>
      </View>

      <StepsBanner />

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SOCIAL_DOCK_SPACE + 16 }]} showsVerticalScrollIndicator={false}>
          <Text style={[SOCIAL_TYPE.display, styles.heading, { color: p.text }]}>Move</Text>

          {/* Today: the streak as the figure, the habits as marks, one action */}
          <View style={styles.today}>
            <View style={styles.figureRow}>
              <Ionicons name="flame" size={30} color={streak > 0 ? '#E8762B' : p.muted} />
              <Text style={[SOCIAL_TYPE.figure, { color: p.text }]}>{streak}</Text>
              <Text style={[SOCIAL_TYPE.body, { color: p.muted }]}>day streak</Text>
            </View>
            <Text style={[SOCIAL_TYPE.body, { color: p.muted }]}>
              {completed.length} of {SOCIAL_TOPICS.length} habits checked in today
            </Text>
            <View style={styles.marks}>
              {SOCIAL_TOPICS.map((t) => (
                <View key={t.value} style={[styles.mark, { backgroundColor: completed.includes(t.value) ? p.accent : p.border }]} />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Check in to your habits"
              onPress={() => {
                tapSelection();
                setHabitsOpen(true);
              }}
              style={[styles.primary, { backgroundColor: p.accent }]}>
              <Text style={[SOCIAL_TYPE.bodyStrong, { color: '#FFFFFF' }]}>Check in today</Text>
            </Pressable>
          </View>

          <StepsCard />

          {/* The three things you do over time: plain rows on thin rules */}
          <View style={[styles.list, { borderTopColor: p.border }]}>
            {rows.map((row) => (
              <Pressable key={row.title} accessibilityRole="button" onPress={() => router.push(row.href as never)} style={[styles.row, { borderBottomColor: p.border }]}>
                <View style={styles.rowText}>
                  <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>{row.title}</Text>
                  <Text numberOfLines={2} style={[SOCIAL_TYPE.small, { color: p.muted }]}>{row.line}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={p.muted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* The habits in a drawer. Tap a habit to check in, tap it again to take it back. */}
      <BottomSheet visible={habitsOpen} onClose={() => setHabitsOpen(false)}>
        <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>Today&apos;s check-in</Text>
        <Text style={[SOCIAL_TYPE.small, { color: p.muted }]}>
          {completed.length} of {SOCIAL_TOPICS.length} habits today. Check in to the ones you did.
        </Text>
        <View style={[styles.habitGrid, { borderTopColor: p.border }]}>
          {SOCIAL_TOPICS.map((t) => {
            const done = completed.includes(t.value);
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
                style={[styles.habitChip, { borderColor: done ? p.accent : p.border, backgroundColor: done ? p.accentSoft : 'transparent' }]}>
                <Ionicons name={done ? 'checkmark' : (HABIT_ICONS[t.value] ?? 'checkmark-circle-outline')} size={15} color={done ? p.accent : p.muted} />
                <Text style={[SOCIAL_TYPE.label, { color: done ? p.accent : p.text }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <SocialDock active="move" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  gutter: { flex: 1, paddingHorizontal: SOCIAL_SPACE.edge, paddingTop: SOCIAL_SPACE.inner },
  body: { paddingHorizontal: SOCIAL_SPACE.edge, gap: SOCIAL_SPACE.group },
  // The body puts 24 between its parts; the heading and today belong together, so the heading pulls the streak up to 8 below it.
  heading: { marginBottom: -(SOCIAL_SPACE.group - 8) },
  today: { gap: SOCIAL_SPACE.inner },
  figureRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  marks: { flexDirection: 'row', gap: 6 },
  mark: { flex: 1, height: 6, borderRadius: 3 },
  primary: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  list: { borderTopWidth: SOCIAL_RULE },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18, borderBottomWidth: SOCIAL_RULE },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  habitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 14, marginTop: 12, borderTopWidth: SOCIAL_RULE },
  habitChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, borderWidth: 1 },
});
