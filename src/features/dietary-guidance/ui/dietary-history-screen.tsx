import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScrollToTopOnFocus } from '@shared/lib';
import { ConfirmDialog } from '@shared/ui';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { useDeleteDietaryChart, useDietaryHistory, type DietaryChartListItem } from '@entities/dietary-chart';

const GOAL_LABELS: Record<string, string> = { stay_healthy: 'Stay healthy', build_muscle: 'Build muscle and strength', lose_weight: 'Lose weight steadily' };
const DIET_LABELS: Record<string, string> = { vegetarian: 'Vegetarian', eggetarian: 'Eggetarian', non_vegetarian: 'Non-vegetarian', vegan: 'Vegan', jain: 'Jain' };
const GOAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = { stay_healthy: 'leaf-outline', build_muscle: 'barbell-outline', lose_weight: 'trending-down-outline' };

// A month for the heading of a group, like "November 2026".
const monthLabel = (iso: string): string => new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

// Every dietary chart the person has made (up to 50), newest first and grouped by month, so they can look back at an earlier plan. Tapping a row opens
// the whole chart; each row has a delete button with a question first. Pull down to read the list again. The first row is marked "Latest".
export function DietaryHistoryScreen() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const history = useDietaryHistory();
  const remove = useDeleteDietaryChart();
  const [deleting, setDeleting] = useState<DietaryChartListItem | null>(null);

  const groups = useMemo(() => {
    const out: { label: string; items: DietaryChartListItem[] }[] = [];
    for (const item of history.data ?? []) {
      const label = monthLabel(item.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(item);
      else out.push({ label, items: [item] });
    }
    return out;
  }, [history.data]);
  const latestId = history.data?.[0]?.id;
  const back = () => goBackOr(router, '/(app)/dietary-guidance' as Href);

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={back} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>My charts</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={history.isRefetching && !history.isPending} onRefresh={() => void history.refetch()} tintColor={p.accent} />}>
        {history.isPending ? <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} /> : null}
        {history.isError ? (
          <View style={[styles.stateCard, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text style={[styles.cardTitle, { color: p.text }]}>Could not load your charts</Text>
            <Pressable accessibilityRole="button" onPress={() => void history.refetch()} style={[styles.primary, { backgroundColor: p.accent }]}>
              <Text style={styles.primaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {history.data && history.data.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: p.card, borderColor: p.border }]}>
            <Ionicons name="leaf-outline" size={34} color={p.muted} />
            <Text style={[styles.cardTitle, { color: p.text }]}>No charts yet</Text>
            <Text style={[styles.cardText, { color: p.muted, textAlign: 'center' }]}>Make your first dietary chart and it is kept here, so you can come back to an earlier plan.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/dietary-guidance' as Href)} style={[styles.primary, { backgroundColor: p.accent }]}>
              <Text style={styles.primaryText}>Make my chart</Text>
            </Pressable>
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={[styles.groupLabel, { color: p.muted }]}>{group.label}</Text>
            {group.items.map((item) => (
              // The open area and the delete button sit side by side: a button cannot hold a button on the web.
              <View key={item.id} style={[styles.row, { backgroundColor: p.card, borderColor: item.id === latestId ? p.accent : p.border }]}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/(app)/dietary-chart/[id]', params: { id: item.id } } as unknown as Href)}
                  style={styles.rowMain}>
                  <View style={[styles.iconBox, { backgroundColor: p.accentSoft }]}>
                    <Ionicons name={GOAL_ICONS[item.goal] ?? 'leaf-outline'} size={20} color={p.accent} />
                  </View>
                  <View style={styles.rowText}>
                    <View style={styles.titleRow}>
                      <Text numberOfLines={1} style={[styles.cardTitle, { color: p.text, flexShrink: 1 }]}>{GOAL_LABELS[item.goal] ?? item.goal}</Text>
                      {item.id === latestId ? (
                        <View style={[styles.latest, { backgroundColor: p.accentSoft }]}>
                          <Text style={[styles.latestText, { color: p.accent }]}>Latest</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text numberOfLines={1} style={[styles.cardText, { color: p.muted }]}>
                      {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {DIET_LABELS[item.diet_type] ?? item.diet_type} · BMI {item.bmi}
                    </Text>
                    {item.calories_min && item.calories_max ? (
                      <Text numberOfLines={1} style={[styles.cardText, { color: p.accent }]}>
                        {item.calories_min}–{item.calories_max} kcal a day
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={p.muted} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Delete chart" hitSlop={8} onPress={() => setDeleting(item)}>
                  <Ionicons name="trash-outline" size={18} color={p.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        ))}
        {history.data && history.data.length >= 50 ? <Text style={[styles.cardText, { color: p.muted, textAlign: 'center' }]}>Showing your latest 50 charts.</Text> : null}
      </ScrollView>

      <ConfirmDialog
        visible={deleting !== null}
        title="Delete this chart?"
        message="It is removed from your charts. This cannot be undone."
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id, { onSettled: () => setDeleting(null) });
        }}
        onCancel={() => setDeleting(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontWeight: '800' },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  group: { gap: 8 },
  groupLabel: { fontSize: 12.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 16, padding: 12 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  latest: { paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: 'center' },
  latestText: { fontSize: 11, fontWeight: '800' },
  cardTitle: { fontSize: 14.5, fontWeight: '800' },
  cardText: { fontSize: 13, lineHeight: 18 },
  stateCard: { alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 18, padding: 20, marginTop: 24 },
  primary: { height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, alignSelf: 'stretch' },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
