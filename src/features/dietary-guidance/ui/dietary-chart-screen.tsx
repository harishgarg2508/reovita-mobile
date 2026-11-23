import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScrollToTopOnFocus } from '@shared/lib';
import { ConfirmDialog } from '@shared/ui';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { DietaryChartBody, useDeleteDietaryChart, useDietaryChartById } from '@entities/dietary-chart';

const GOAL_LABELS: Record<string, string> = { stay_healthy: 'Stay healthy', build_muscle: 'Build muscle and strength', lose_weight: 'Lose weight steadily' };

// One earlier dietary chart, whole, with the disclaimer. It can be deleted from here.
export function DietaryChartScreen({ id }: { id: string }) {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const chart = useDietaryChartById(id);
  const remove = useDeleteDietaryChart();
  const [confirming, setConfirming] = useState(false);
  const back = () => goBackOr(router, '/(app)/dietary-history' as Href);

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={back} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Your chart</Text>
        {chart.data ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Delete chart" hitSlop={8} onPress={() => setConfirming(true)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
            <Ionicons name="trash-outline" size={18} color={p.text} />
          </Pressable>
        ) : (
          <View style={styles.round} />
        )}
      </View>

      {chart.isPending ? <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} /> : null}
      {chart.isError ? <Text style={[styles.note, { color: p.muted }]}>This chart is not available. It may have been deleted.</Text> : null}
      {chart.data ? (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <Text style={[styles.heading, { color: p.text }]}>{GOAL_LABELS[chart.data.goal] ?? chart.data.goal}</Text>
          <Text style={[styles.sub, { color: p.muted }]}>Made on {new Date(chart.data.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          <DietaryChartBody chart={chart.data.chart} />
        </ScrollView>
      ) : null}

      <ConfirmDialog
        visible={confirming}
        title="Delete this chart?"
        message="It is removed from your charts. This cannot be undone."
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => remove.mutate(id, { onSuccess: () => { setConfirming(false); back(); }, onSettled: () => setConfirming(false) })}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 8 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, letterSpacing: -0.2 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  heading: { fontSize: 22, fontWeight: '800' },
  sub: { fontSize: 13, marginBottom: 6 },
  note: { fontSize: 14, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
});
