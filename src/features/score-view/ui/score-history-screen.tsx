import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScoreTrendBadge, useScoreHistory, type HealthScoreEntry } from '@entities/score';
import { goBackOr } from '@shared/ui';
import { usePalette, type Palette } from '@shared/ui/theme';

import { ScoreHistoryChart } from './score-history-chart';

const PARTS = [
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'reports', label: 'Reports' },
] as const;

// Health score history: the latest score, a graph of the score over time, and each saved score with its trend.
export function ScoreHistoryScreen() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const history = useScoreHistory();
  const entries = history.data ?? [];
  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const first = entries.length > 0 ? entries[0] : null;
  const change = latest && first ? latest.total - first.total : 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => goBackOr(router, '/(app)/(tabs)/dashboard')}
          hitSlop={8}
          style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={p.textStrong} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Score history</Text>
          <Text style={styles.subtitle}>How your health score has changed over time.</Text>
        </View>
      </View>

      {history.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={p.accent} />
        </View>
      ) : history.isError ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Could not load your score history</Text>
          <Pressable accessibilityRole="button" onPress={() => history.refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : !latest ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No score yet</Text>
          <Text style={styles.muted}>Add your lifestyle, conditions or a lab report. Your score and its history will appear here.</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.row}>
              <View>
                <Text style={styles.muted}>Latest score</Text>
                <Text style={styles.total}>{Math.round(latest.total)}</Text>
              </View>
              <View style={styles.right}>
                <ScoreTrendBadge trend={latest.trend} />
                {entries.length > 1 ? (
                  <Text style={styles.muted}>
                    {change === 0 ? 'No change' : `${change > 0 ? '+' : ''}${Math.round(change)} points`} since {longDate(first!.created_at)}
                  </Text>
                ) : null}
              </View>
            </View>
            <ScoreHistoryChart entries={entries} p={p} />
            {entries.length === 1 ? <Text style={styles.muted}>The graph will draw a line once your score changes.</Text> : null}
          </View>

          <Text style={styles.section}>All scores</Text>
          <View style={styles.card}>
            {[...entries].reverse().map((entry, index) => (
              <View key={entry.created_at} style={[styles.item, index > 0 && styles.itemBorder]}>
                <View style={styles.row}>
                  <View>
                    <Text style={styles.itemDate}>{longDate(entry.created_at)}</Text>
                    <Text style={styles.muted}>{timeOf(entry.created_at)}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <ScoreTrendBadge trend={entry.trend} />
                    <Text style={styles.itemTotal}>{Math.round(entry.total)}</Text>
                  </View>
                </View>
                <Text style={styles.parts}>{partsLine(entry)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// "Lifestyle 89 · Conditions 85 · Reports 100". A part with no information yet is left out.
function partsLine(entry: HealthScoreEntry): string {
  const parts = PARTS.map(({ key, label }) => {
    const value = entry.parts?.[key];
    return value === null || value === undefined ? null : `${label} ${Math.round(value)}`;
  }).filter((text): text is string => text !== null);
  return parts.join('  ·  ');
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.surface },
    content: { padding: 16, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    back: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: p.border, backgroundColor: p.card, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 },
    title: { fontSize: 22, fontWeight: '800', color: p.textStrong },
    subtitle: { fontSize: 13, color: p.muted, marginTop: 2 },
    center: { paddingVertical: 60, alignItems: 'center' },
    card: { backgroundColor: p.card, borderRadius: 22, borderWidth: 1, borderColor: p.border, padding: 16, gap: 12 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: p.textStrong },
    muted: { fontSize: 12.5, color: p.muted, lineHeight: 18 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    right: { alignItems: 'flex-end', gap: 6, flexShrink: 1 },
    total: { fontSize: 44, fontWeight: '800', color: p.textStrong, letterSpacing: 1 },
    section: { fontSize: 15, fontWeight: '700', color: p.textStrong, marginTop: 4 },
    item: { gap: 6, paddingVertical: 12 },
    itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
    itemDate: { fontSize: 14, fontWeight: '600', color: p.textStrong },
    itemRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    itemTotal: { fontSize: 22, fontWeight: '800', color: p.textStrong, minWidth: 38, textAlign: 'right' },
    parts: { fontSize: 12.5, color: p.muted },
    retry: { height: 44, borderRadius: 14, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    retryText: { color: '#FFFFFF', fontWeight: '700' },
  });
}
