import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isDocumentReport, reportTypeLabel, useReportList } from '@entities/report';
import { Skeleton } from '@shared/ui/skeleton';
import { Rule, Type, usePalette, type Palette } from '@shared/ui/theme';

import { useProfileStepSaved } from '../model/use-profile-details';
import { historyRows, lifestyleRows, type Row } from './profile-details-card';

export type HealthPart = 'lifestyle' | 'conditions' | 'reports';

const TITLES: Record<HealthPart, string> = {
  lifestyle: 'Lifestyle',
  conditions: 'Conditions',
  reports: 'Reports',
};

const HINTS: Record<HealthPart, string> = {
  lifestyle: 'How this person sleeps, moves and spends their days.',
  conditions: 'Health conditions and the family history saved for this person.',
  reports: 'The lab reports and prescriptions saved for this person.',
};

// A read-only screen for one part of a person's health. The values are shown as saved; nothing here can be changed, and there is no link to any other
// feature of the app. A family member's health is shown this way when it is viewed.
export function HealthDetailView({ part, familyView }: { part: HealthPart; familyView: boolean }) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lifestyle = useProfileStepSaved(3);
  // Smoking and alcohol are private to the person: a family view never shows them, and the person's own view keeps them in a Private section.
  const history = useProfileStepSaved(2);
  const reports = useReportList();

  const items = reports.data?.pages.flatMap((page) => page.items) ?? [];
  const body = (() => {
    if (part === 'lifestyle') {
      const all = lifestyleRows(lifestyle.data ?? {});
      const isPrivate = (row: Row) => row.label === 'Smoking' || row.label === 'Alcohol';
      return (
        <>
          <Rows rows={all.filter((row) => !isPrivate(row))} loading={lifestyle.isLoading} styles={styles} />
          {familyView ? (
            <Text style={styles.empty}>Smoking and alcohol are private to this person.</Text>
          ) : (
            <View style={styles.privateCard}>
              <View style={styles.privateHead}>
                <Ionicons name="lock-closed-outline" size={14} color={p.muted} />
                <Text style={styles.privateTitle}>Private</Text>
              </View>
              <Text style={styles.hint}>Only you can see this.</Text>
              <Rows rows={all.filter(isPrivate)} loading={lifestyle.isLoading} styles={styles} />
            </View>
          )}
        </>
      );
    }
    if (part === 'conditions') {
      const medicines = (history.data?.medications as { name: string | null; dose: string | null }[] | undefined) ?? [];
      return (
        <>
          <Rows rows={historyRows(history.data ?? {})} loading={history.isLoading} styles={styles} />
          {medicines.some((m) => m.name) ? (
            <View style={styles.stack}>
              <Text style={styles.label}>Medicines</Text>
              {medicines
                .filter((m) => m.name)
                .map((m, i) => (
                  <View key={`${m.name}-${i}`} style={styles.medRow}>
                    <Text style={[styles.value, styles.flex]}>{m.name}</Text>
                    {m.dose ? <Text style={styles.label}>{m.dose}</Text> : null}
                  </View>
                ))}
            </View>
          ) : null}
        </>
      );
    }
    if (reports.isPending) return <Skeleton height={90} />;
    if (items.length === 0) return <Text style={styles.empty}>No reports saved yet.</Text>;
    return (
      <>
        {items.map((item) => (
          <View key={item.id} style={styles.stack}>
            <Text style={styles.value}>{reportTypeLabel(item)}</Text>
            <Text style={styles.label}>
              {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {isDocumentReport(item) ? ' · document' : ''}
            </Text>
          </View>
        ))}
      </>
    );
  })();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={p.text} />
        </Pressable>
        <Text style={[styles.title, styles.flex]}>{TITLES[part]}</Text>
        <View style={styles.viewOnly}>
          <Ionicons name="eye-outline" size={14} color={p.muted} />
          <Text style={styles.viewOnlyText}>View only</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.hint}>{HINTS[part]}</Text>
        <View style={styles.card}>{body}</View>
      </ScrollView>
    </View>
  );
}

function Rows({ rows, loading, styles }: { rows: Row[]; loading: boolean; styles: Styles }) {
  if (loading) return <ActivityIndicator style={{ marginVertical: 16 }} />;
  const visible = rows.filter((row) => row.value !== null && row.value !== '');
  if (visible.length === 0) return <Text style={styles.empty}>Nothing has been saved yet.</Text>;
  return (
    <>
      {visible.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(p: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: p.bg },
    flex: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
    title: { ...Type.title, color: p.textStrong },
    viewOnly: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: p.surface },
    viewOnlyText: { ...Type.small, color: p.muted },
    body: { paddingHorizontal: 20, gap: 12 },
    hint: { ...Type.small, color: p.muted },
    card: { borderRadius: 18, borderWidth: 1, borderColor: p.border, backgroundColor: p.card, paddingHorizontal: 16, paddingVertical: 4 },
    row: { gap: 4, paddingVertical: 12, borderBottomWidth: Rule, borderBottomColor: p.border },
    stack: { gap: 4, paddingVertical: 12, borderBottomWidth: Rule, borderBottomColor: p.border },
    medRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingTop: 4 },
    label: { ...Type.small, color: p.muted },
    value: { ...Type.bodyStrong, color: p.textStrong },
    empty: { ...Type.small, color: p.muted, paddingVertical: 14 },
    privateCard: { marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
    privateHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    privateTitle: { ...Type.bodyStrong, color: p.textStrong },
  });
}
