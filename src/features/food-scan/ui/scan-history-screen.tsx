import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScrollToTopOnFocus } from '@shared/lib';
import { ConfirmDialog } from '@shared/ui';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { useDeleteFoodScan, useFoodScans, type FoodScanKind, type FoodScanView, type FridgeScanResult, type MealScanResult } from '@entities/food-scan';

// How many past scans the history asks for.
const HISTORY_LIMIT = 50;

const ROUTES: Record<FoodScanKind, Href> = { meal: '/(app)/meal-scan' as Href, fridge: '/(app)/fridge-scan' as Href };

// A day for the heading of a group: Today, Yesterday, or the date.
function dayLabel(iso: string): string {
  const day = new Date(iso);
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(day)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: day.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

const timeLabel = (iso: string): string => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

// Every past scan of one kind (up to 50), newest first and grouped by day, so the person can look back at what was in the fridge or on the plate and
// what was suggested. Tapping a row opens that scan; each row has a delete button with a question first. Pull down to read the list again. Only the
// answers are kept: the photos were never saved.
export function ScanHistoryScreen({ kind }: { kind: FoodScanKind }) {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const history = useFoodScans(kind, HISTORY_LIMIT);
  const remove = useDeleteFoodScan();
  const [deleting, setDeleting] = useState<FoodScanView | null>(null);

  const groups = useMemo(() => {
    const out: { label: string; items: FoodScanView[] }[] = [];
    for (const item of history.data ?? []) {
      const label = dayLabel(item.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(item);
      else out.push({ label, items: [item] });
    }
    return out;
  }, [history.data]);

  const title = kind === 'fridge' ? 'Fridge scans' : 'Meal scans';
  const icon = kind === 'fridge' ? 'nutrition-outline' : 'restaurant-outline';
  const back = () => goBackOr(router, ROUTES[kind]);

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={back} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>{title}</Text>
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
            <Text style={[styles.cardTitle, { color: p.text }]}>Could not load your scans</Text>
            <Pressable accessibilityRole="button" onPress={() => void history.refetch()} style={[styles.primary, { backgroundColor: p.accent }]}>
              <Text style={styles.primaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {history.data && history.data.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: p.card, borderColor: p.border }]}>
            <Ionicons name={icon} size={34} color={p.muted} />
            <Text style={[styles.cardTitle, { color: p.text }]}>{kind === 'fridge' ? 'No fridge scans yet' : 'No meal scans yet'}</Text>
            <Text style={[styles.cardText, { color: p.muted, textAlign: 'center' }]}>
              {kind === 'fridge' ? 'Scan your fridge and the answer is kept here, so you can come back to the meals it suggested.' : 'Scan a meal and the answer is kept here.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.push(ROUTES[kind])} style={[styles.primary, { backgroundColor: p.accent }]}>
              <Text style={styles.primaryText}>{kind === 'fridge' ? 'Scan my fridge' : 'Scan my meal'}</Text>
            </Pressable>
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={[styles.groupLabel, { color: p.muted }]}>{group.label}</Text>
            {group.items.map((item) => (
              // The open area and the delete button are side by side: a button cannot hold a button on the web.
              <View key={item.id} style={[styles.row, { backgroundColor: p.card, borderColor: p.border }]}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/(app)/food-scan/[id]', params: { id: item.id } } as Href)}
                  style={styles.rowMain}>
                  <View style={[styles.iconBox, { backgroundColor: p.accentSoft }]}>
                    <Ionicons name={icon} size={20} color={p.accent} />
                  </View>
                  <View style={styles.rowText}>
                    {kind === 'fridge' ? <FridgeSummary result={item.result as FridgeScanResult} time={timeLabel(item.created_at)} /> : <MealSummary result={item.result as MealScanResult} time={timeLabel(item.created_at)} />}
                  </View>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Delete scan" hitSlop={8} onPress={() => setDeleting(item)}>
                  <Ionicons name="trash-outline" size={18} color={p.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        ))}
        {history.data && history.data.length >= HISTORY_LIMIT ? <Text style={[styles.cardText, { color: p.muted, textAlign: 'center' }]}>Showing your latest {HISTORY_LIMIT} scans.</Text> : null}
      </ScrollView>

      <ConfirmDialog
        visible={deleting !== null}
        title="Delete this scan?"
        message="It is removed from your history. This cannot be undone."
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

function FridgeSummary({ result, time }: { result: FridgeScanResult; time: string }) {
  const p = usePalette();
  const names = result.ingredients.slice(0, 4).map((i) => i.name);
  const more = result.ingredients.length - names.length;
  const top = result.meal_ideas[0]?.name;
  return (
    <>
      <Text numberOfLines={1} style={[styles.cardTitle, { color: p.text }]}>
        {result.ingredients.length} {result.ingredients.length === 1 ? 'food' : 'foods'} seen · {time}
      </Text>
      <Text numberOfLines={1} style={[styles.cardText, { color: p.muted }]}>
        {names.join(', ')}
        {more > 0 ? ` and ${more} more` : ''}
      </Text>
      {top ? (
        <Text numberOfLines={1} style={[styles.cardText, { color: p.accent }]}>
          {result.meal_ideas.length} meal {result.meal_ideas.length === 1 ? 'idea' : 'ideas'} · {top}
        </Text>
      ) : null}
    </>
  );
}

function MealSummary({ result, time }: { result: MealScanResult; time: string }) {
  const p = usePalette();
  return (
    <>
      <Text numberOfLines={1} style={[styles.cardTitle, { color: p.text }]}>{result.dish_name}</Text>
      <Text numberOfLines={1} style={[styles.cardText, { color: p.muted }]}>
        {result.total.calories} kcal · {result.total.protein_g} g protein · {time}
      </Text>
    </>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { fontSize: 14.5, fontWeight: '800' },
  cardText: { fontSize: 13, lineHeight: 18 },
  stateCard: { alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 18, padding: 20, marginTop: 24 },
  primary: { height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, alignSelf: 'stretch' },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
