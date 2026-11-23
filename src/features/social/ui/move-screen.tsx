import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapSelection, useScrollToTopOnFocus } from '@shared/lib';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_TOPICS, useJourneys, useMyHandle, useSocialPods, useSocialQuests, useTodayCheckIns } from '@entities/social';

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

// The Move tab: everything about keeping going, in one place. Today's check-in and streak at the top, then the steps card, then the three things you do with
// friends or for a goal: Journeys, Pods and Quests. Each is a card with one line of where you stand; tapping it opens the full screen.
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

  const rows: { icon: keyof typeof Ionicons.glyphMap; title: string; line: string; href: string }[] = [
    {
      icon: 'map-outline',
      title: 'Journeys',
      line: running.length > 0 ? `${running.length} on the road, your best is ${Math.round(best)}% along` : 'Walk a route with friends on a 3D map',
      href: '/social/journeys',
    },
    {
      icon: 'people-circle-outline',
      title: 'Pods',
      line: (pods.data?.length ?? 0) > 0 ? `${pods.data?.length} ${pods.data?.length === 1 ? 'pod' : 'pods'}, best streak ${podStreak} ${podStreak === 1 ? 'week' : 'weeks'}` : 'A small private group with a weekly target',
      href: '/social/pods',
    },
    {
      icon: 'trophy-outline',
      title: 'Quests and leaderboard',
      line: quests.data ? `${quests.data.completed_count} done this month, ${quests.data.days_left} days left` : 'Monthly goals and your friends ranked',
      href: '/social/quests',
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => goBackOr(router, SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Move</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Social settings" hitSlop={8} onPress={() => router.push(socialRoute('/social/settings'))} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="settings-outline" size={19} color={p.text} />
        </Pressable>
      </View>

      <StepsBanner />

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SOCIAL_DOCK_SPACE + 16 }]} showsVerticalScrollIndicator={false}>
          {/* Today */}
          <View style={[styles.today, { backgroundColor: p.card, borderColor: p.border }]}>
            <View style={styles.todayTop}>
              <View style={[styles.flame, { backgroundColor: streak > 0 ? '#FEF3EB' : p.surface }]}>
                <Ionicons name="flame" size={26} color={streak > 0 ? '#E8762B' : p.muted} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.streak, { color: p.text }]}>{streak}-day streak</Text>
                <Text style={[styles.hint, { color: p.muted }]}>
                  {completed.length} of {SOCIAL_TOPICS.length} habits checked in today
                </Text>
              </View>
            </View>
            <View style={styles.dots}>
              {SOCIAL_TOPICS.map((t) => (
                <View key={t.value} style={[styles.dot, { backgroundColor: completed.includes(t.value) ? p.accent : p.surface, borderColor: completed.includes(t.value) ? p.accent : p.border }]} />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Check in to your habits"
              onPress={() => {
                tapSelection();
                setHabitsOpen(true);
              }}
              style={[styles.checkIn, { backgroundColor: p.accent }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.checkInText}>Check in today</Text>
            </Pressable>
          </View>

          <StepsCard />

          {rows.map((row) => (
            <Pressable key={row.title} accessibilityRole="button" onPress={() => router.push(row.href as never)} style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={[styles.cardIcon, { backgroundColor: p.accentSoft }]}>
                <Ionicons name={row.icon} size={22} color={p.accent} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.cardTitle, { color: p.text }]}>{row.title}</Text>
                <Text numberOfLines={2} style={[styles.hint, { color: p.muted }]}>{row.line}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={p.muted} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* The habits in a drawer. Tap a habit to check in, tap it again to take it back. */}
      <BottomSheet visible={habitsOpen} onClose={() => setHabitsOpen(false)}>
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetTitle, { color: p.text }]}>Today&apos;s check-in</Text>
          <View style={[styles.streakPill, { backgroundColor: streak > 0 ? '#FEF3EB' : p.surface }]}>
            <Ionicons name="flame" size={16} color={streak > 0 ? '#E8762B' : p.muted} />
            <Text style={[styles.streakPillText, { color: streak > 0 ? '#D65A12' : p.muted }]}>{streak}-day streak</Text>
          </View>
        </View>
        <Text style={[styles.hint, { color: p.muted }]}>
          {completed.length} of {SOCIAL_TOPICS.length} habits today. Check in to the ones you did.
        </Text>
        <View style={styles.habitGrid}>
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
                style={[styles.habitChip, { borderColor: done ? p.accent : p.border, backgroundColor: done ? p.accentSoft : p.surface }]}>
                <Ionicons name={done ? 'checkmark' : (HABIT_ICONS[t.value] ?? 'checkmark-circle-outline')} size={14} color={done ? p.accent : p.muted} />
                <Text style={[styles.habitChipText, { color: done ? p.accent : p.text, fontWeight: done ? '700' : '600' }]}>{t.label}</Text>
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
  flex: { flex: 1, minWidth: 0, gap: 2 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  today: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 14 },
  todayTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flame: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  streak: { fontSize: 20, fontWeight: '800' },
  hint: { fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 8, borderRadius: 4, borderWidth: 1 },
  checkIn: { height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  checkInText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 20, padding: 14 },
  cardIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15.5, fontWeight: '800' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  streakPillText: { fontSize: 12.5, fontWeight: '800' },
  habitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 12, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.2)' },
  habitChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, height: 32, borderRadius: 16, borderWidth: 1 },
  habitChipText: { fontSize: 12 },
});
