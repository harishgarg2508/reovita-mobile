import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { partWord, ScoreTrendBadge, scoreZone, useScoreHistory, type HealthScoreEntry } from '@entities/score';
import { goBackOr } from '@shared/ui';
import { Gap, Rule, Type, usePalette, type Palette } from '@shared/ui/theme';

import { ScoreHistoryChart } from './score-history-chart';
import { useScrollToTopOnFocus } from '@shared/lib';

const PARTS = [
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'reports', label: 'Reports' },
] as const;

// Health score history: the latest score, a graph of the score over time, and each saved score with its trend.
export function ScoreHistoryScreen() {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const history = useScoreHistory();
  // Pages arrive newest first. The graph needs oldest first, so the loaded scores are reversed for it.
  const newestFirst = useMemo(() => (history.data?.pages ?? []).flatMap((page) => page.items), [history.data]);
  const entries = useMemo(() => [...newestFirst].reverse(), [newestFirst]);
  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const first = entries.length > 0 ? entries[0] : null;
  const change = latest && first ? latest.total - first.total : 0;
  const loadMore = () => {
    if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
  };

  return (
    <ScrollView ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 4, paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
      onScroll={({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        // Load the next page when the user is within 200 px of the bottom.
        if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) loadMore();
      }}
      scrollEventThrottle={200}>
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
      ) : history.isError && entries.length === 0 ? (
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
                <Text style={[styles.total, { color: scoreZone(latest.total).color }]}>{scoreZone(latest.total).word}</Text>
              </View>
              <View style={styles.right}>
                <ScoreTrendBadge trend={latest.trend} />
                {entries.length > 1 ? (
                  <Text style={styles.muted}>
                    {Math.abs(change) < 1 ? 'No change' : change > 0 ? 'Higher' : 'Lower'} since {longDate(first!.created_at)}
                  </Text>
                ) : null}
              </View>
            </View>
            <ScoreHistoryChart entries={entries} p={p} />
            {entries.length === 1 ? <Text style={styles.muted}>The graph will draw a line once your score changes.</Text> : null}
          </View>

          <Text style={styles.section}>All scores</Text>
          <View style={styles.list}>
            {newestFirst.map((entry, index) => (
              <View key={entry.created_at} style={[styles.item, index > 0 && styles.itemBorder]}>
                <View style={styles.row}>
                  <View>
                    <Text style={styles.itemDate}>{longDate(entry.created_at)}</Text>
                    <Text style={styles.muted}>{timeOf(entry.created_at)}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <ScoreTrendBadge trend={entry.trend} />
                    <Text style={[styles.itemTotal, { color: scoreZone(entry.total).color }]}>{scoreZone(entry.total).word}</Text>
                  </View>
                </View>
                <Text style={styles.parts}>{partsLine(entry)}</Text>
              </View>
            ))}
            {history.isFetchingNextPage ? (
              <View style={styles.center}>
                <ActivityIndicator color={p.accent} />
              </View>
            ) : history.hasNextPage ? (
              <Pressable accessibilityRole="button" onPress={loadMore} style={styles.moreBtn}>
                <Text style={styles.moreText}>Load older scores</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// "Lifestyle Normal, Conditions Watch, Reports Normal". A part with no information yet is left out.
function partsLine(entry: HealthScoreEntry): string {
  const parts = PARTS.map(({ key, label }) => {
    const word = partWord(entry.parts?.[key]);
    return word === null ? null : `${label} ${word}`;
  }).filter((text): text is string => text !== null);
  return parts.join(', ');
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.bg },
    content: { paddingHorizontal: Gap.edge, gap: Gap.group },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
    headerText: { flex: 1 },
    title: { ...Type.display, fontSize: 26, lineHeight: 32, color: p.textStrong },
    subtitle: { ...Type.small, color: p.muted, marginTop: 2 },
    center: { paddingVertical: 60, alignItems: 'center' },
    // The latest score and its graph are the one framed object; the list of scores is rows on rules.
    card: { backgroundColor: p.card, borderRadius: 22, borderWidth: Rule, borderColor: p.border, padding: 16, gap: 12 },
    list: { borderTopWidth: Rule, borderTopColor: p.border },
    cardTitle: { ...Type.heading, color: p.textStrong },
    muted: { ...Type.small, color: p.muted },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    right: { alignItems: 'flex-end', gap: 6, flexShrink: 1 },
    total: { ...Type.figure, color: p.textStrong },
    section: { ...Type.title, color: p.textStrong, marginBottom: -Gap.inner },
    item: { gap: 4, paddingVertical: 16, borderBottomWidth: Rule, borderBottomColor: p.border },
    itemBorder: {},
    itemDate: { ...Type.bodyStrong, color: p.textStrong },
    itemRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    itemTotal: { ...Type.bodyStrong, color: p.textStrong, minWidth: 64, textAlign: 'right' },
    parts: { ...Type.small, color: p.muted },
    retry: { height: 48, borderRadius: 24, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    retryText: { ...Type.bodyStrong, color: '#FFFFFF' },
    moreBtn: { height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: p.accent, alignItems: 'center', justifyContent: 'center', marginTop: Gap.inner },
    moreText: { ...Type.label, color: p.accent },
  });
}
