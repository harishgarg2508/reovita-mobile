import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useInteractions, type InteractionCheck, type InteractionFinding } from '@entities/interaction-finding';
import { goBackOr } from '@shared/ui';
import { usePalette, type Palette } from '@shared/ui/theme';
import { useScrollToTopOnFocus } from '@shared/lib';

const SEVERITY_ORDER = ['Contraindicated', 'Major', 'Moderate', 'Minor'];

// Medicine interaction check. Every outcome is shown with what was actually checked, so an unavailable check
// never looks like a safe result.
export function InteractionScreen() {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const check = useInteractions();

  return (
    <ScrollView ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: Math.max(insets.bottom, 20) + 16 },
      ]}>
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
          <Text style={styles.title}>Medication check</Text>
          <Text style={styles.subtitle}>Checks your active medicines against each other.</Text>
        </View>
      </View>

      {check.isLoading ? (
        <ActivityIndicator color={p.accent} style={styles.center} />
      ) : check.isError ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>The check could not be loaded</Text>
          <Text style={styles.muted}>Try again. Nothing has been checked yet.</Text>
          <Pressable accessibilityRole="button" onPress={() => check.refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : check.data ? (
        <Result data={check.data} p={p} />
      ) : null}
    </ScrollView>
  );
}

function Result({ data, p }: { data: InteractionCheck; p: Palette }) {
  const styles = makeStyles(p);
  const groups = useMemo(() => groupBySeverity(data.findings), [data.findings]);
  const tone = data.status === 'findings' ? p.red : data.status === 'no_findings' ? p.accent : p.muted;
  const icon: keyof typeof Ionicons.glyphMap =
    data.status === 'findings' ? 'warning' : data.status === 'no_findings' ? 'checkmark-circle' : 'information-circle';

  return (
    <>
      <View style={[styles.card, { borderColor: tone }]}>
        <View style={styles.statusRow}>
          <Ionicons name={icon} size={20} color={tone} />
          <Text style={[styles.statusText, { color: tone }]}>{data.message}</Text>
        </View>
        {data.unmatched_medications.length > 0 ? (
          <Text style={styles.muted}>
            Not checked, because we could not match them yet: {data.unmatched_medications.join(', ')}.
          </Text>
        ) : null}
      </View>

      {groups.map(([severity, items]) => (
        <View key={severity} style={styles.card}>
          <Text style={styles.cardTitle}>{severity}</Text>
          {items.map((f, index) => (
            <View key={`${f.medication_a}-${f.medication_b}-${index}`} style={styles.finding}>
              <Text style={styles.pair}>
                {f.medication_a} + {f.medication_b}
              </Text>
              {f.mechanism ? <Text style={styles.muted}>{f.mechanism}</Text> : null}
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.disclaimer}>{data.disclaimer}</Text>
    </>
  );
}

function groupBySeverity(findings: InteractionFinding[]): [string, InteractionFinding[]][] {
  const map = new Map<string, InteractionFinding[]>();
  for (const f of findings) map.set(f.severity, [...(map.get(f.severity) ?? []), f]);
  return [...map.entries()].sort(([a], [b]) => {
    const ia = SEVERITY_ORDER.indexOf(a);
    const ib = SEVERITY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.surface },
    content: { padding: 16, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    back: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    title: { fontSize: 22, fontWeight: '800', color: p.textStrong },
    subtitle: { fontSize: 13, color: p.muted, marginTop: 2 },
    center: { paddingVertical: 60, alignItems: 'center' },
    card: { backgroundColor: p.card, borderRadius: 22, borderWidth: 1, borderColor: p.border, padding: 16, gap: 10 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: p.textStrong },
    statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    statusText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    muted: { fontSize: 12.5, color: p.muted, lineHeight: 18 },
    finding: { gap: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
    pair: { fontSize: 14, fontWeight: '700', color: p.textStrong },
    disclaimer: { fontSize: 12.5, color: p.muted, lineHeight: 18, textAlign: 'center', marginTop: 4 },
    retry: { height: 44, borderRadius: 14, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    retryText: { color: '#FFFFFF', fontWeight: '700' },
  });
}
