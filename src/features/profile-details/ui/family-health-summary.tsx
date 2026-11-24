import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useHome } from '@entities/home';
import { useMeasurements } from '@entities/measurement';
import { MEDICAL_HISTORY_PAGE_SIZE, useMedicalHistoryPages } from '@entities/medical-history';
import { isDocumentReport, reportTypeLabel, useReportList } from '@entities/report';
import { Rule, Type, usePalette, type Palette } from '@shared/ui/theme';

import { historyRows, lifestyleRows, type Row } from './profile-details-card';
import { useProfileStepSaved } from '../model/use-profile-details';

// The health summary of a family member, in the layout of the access summary: the overall score, the three parts, the reports, the lifestyle and
// conditions, the latest readings, the family history, the medicines and the medical history. Everything is read from the member's own profile, so
// no access request is needed. Smoking and alcohol are private and are never shown here.
export function FamilyHealthSummary({ displayName }: { displayName: string }) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const router = useRouter();
  const home = useHome();
  const basics = useProfileStepSaved(1);
  const history = useProfileStepSaved(2);
  const lifestyle = useProfileStepSaved(3);
  const reports = useReportList();
  const readings = useMeasurements();
  const historyPages = useMedicalHistoryPages(MEDICAL_HISTORY_PAGE_SIZE);
  const historyEntries = historyPages.data?.pages.flat() ?? [];
  // The reports are read only: the first ten show, and "Show more" adds ten at a time. Further pages load from the server when needed.
  const [reportsShown, setReportsShown] = useState(REPORTS_PER_STEP);
  const allReports = reports.data?.pages.flatMap((page) => page.items) ?? [];
  const pageReports = allReports.slice(0, reportsShown);
  const hasMoreReports = allReports.length > reportsShown || !!reports.hasNextPage;
  function showMoreReports() {
    if (allReports.length <= reportsShown && reports.hasNextPage) void reports.fetchNextPage();
    setReportsShown((value) => value + REPORTS_PER_STEP);
  }

  const score = home.data?.health_score ? Number(home.data.health_score) : null;
  const parts = home.data?.health_score_parts ?? { lifestyle: null, conditions: null, reports: null };
  const b = (basics.data ?? {}) as Record<string, unknown>;
  const meds = (history.data?.medications as { name: string | null; dose: string | null }[] | undefined) ?? [];
  const lifeRows = lifestyleRows(lifestyle.data ?? {}).filter((r) => r.label !== 'Smoking' && r.label !== 'Alcohol');
  const latest = (type: string) => (readings.data ?? []).find((r) => r.type === type) ?? null;
  const sys = latest('bp_sys');
  const dia = latest('bp_dia');
  const weight = latest('weight_kg');
  const famRows = historyRows(history.data ?? {}).filter((r) => r.label.endsWith(' history'));
  const age = typeof b.birth_year === 'number' ? new Date().getFullYear() - b.birth_year : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.identity}>
        <Text style={[Type.heading, { color: p.textStrong }]}>{displayName}</Text>
        <Text style={[Type.small, { color: p.muted }]}>
          {[age !== null ? `${age} years` : null, typeof b.sex === 'string' ? b.sex : null, typeof b.height_cm === 'number' ? `${b.height_cm} cm` : null]
            .filter(Boolean)
            .join('  ')}
        </Text>
      </View>

      {/* Overall score */}
      <View style={styles.card}>
        <Text style={[Type.label, { color: p.muted }]}>Overall health score</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreMeta}>
            <Text style={[Type.bodyStrong, { color: p.textStrong }]}>{overallLabel(score)}</Text>
            <View style={[styles.bar, { backgroundColor: p.surface }]}>
              <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, score ?? 0))}%`, backgroundColor: bandColor(score, p) }]} />
            </View>
          </View>
        </View>
      </View>

      {/* The three parts: each opens its view-only screen */}
      <View style={styles.parts}>
        <PartTile label="Lifestyle" score={parts.lifestyle ?? null} p={p} styles={styles} />
        <PartTile label="Conditions" score={parts.conditions ?? null} p={p} styles={styles} />
        <PartTile label="Reports" score={parts.reports ?? null} p={p} styles={styles} />
      </View>

      {/* Lab reports */}
      <Section title="Lab reports" p={p} styles={styles}>
        {allReports.length === 0 ? (
          <Text style={[Type.small, { color: p.muted }]}>No reports saved yet.</Text>
        ) : (
          pageReports.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${reportTypeLabel(item)}`}
              onPress={() => router.push({ pathname: '/(app)/reports/interpretation/[id]', params: { id: item.id } } as never)}
              style={styles.line}>
              <View style={styles.flex}>
                <Text style={[Type.bodyStrong, { color: p.text }]}>{reportTypeLabel(item)}</Text>
                <Text style={[Type.small, { color: p.muted }]}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {isDocumentReport(item) ? ' · document' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={p.muted} />
            </Pressable>
          ))
        )}
        {hasMoreReports ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Show more reports" onPress={showMoreReports} style={styles.more}>
            <Text style={[Type.label, { color: p.accent }]}>Show more</Text>
            <Ionicons name="chevron-down" size={14} color={p.accent} />
          </Pressable>
        ) : null}
      </Section>

      {/* Lifestyle and conditions */}
      <View style={styles.stack}>
        <View style={styles.card}>
          <Text style={[Type.label, { color: p.muted }]}>Lifestyle</Text>
          {lifeRows.length === 0 ? <Text style={[Type.small, { color: p.muted }]}>Nothing saved.</Text> : lifeRows.slice(0, 4).map((row) => <Pair key={row.label} row={row} styles={styles} />)}
        </View>
        <View style={styles.card}>
          <Text style={[Type.label, { color: p.muted }]}>Medical conditions</Text>
          {historyRows(history.data ?? {}).find((r) => r.label === 'Conditions')?.value ? (
            <Text style={[Type.bodyStrong, { color: p.textStrong }]}>{historyRows(history.data ?? {}).find((r) => r.label === 'Conditions')?.value}</Text>
          ) : (
            <Text style={[Type.small, { color: p.muted }]}>None saved.</Text>
          )}
        </View>
      </View>

      {/* Latest readings */}
      <Section title="Latest vitals" p={p} styles={styles}>
        <Reading label="Weight" value={weight ? `${weight.value} kg` : null} styles={styles} />
        <Reading label="Blood pressure" value={sys && dia ? `${sys.value} / ${dia.value} mmHg` : null} styles={styles} />
      </Section>

      {/* Family history */}
      <Section title="Family history" p={p} styles={styles}>
        {famRows.every((r) => !r.value) ? (
          <Text style={[Type.small, { color: p.muted }]}>No family history recorded.</Text>
        ) : (
          famRows.filter((r) => r.value).map((r) => <Reading key={r.label} label={r.label} value={r.value} styles={styles} />)
        )}
      </Section>

      {/* Medicines */}
      <Section title="Medicines" p={p} styles={styles}>
        {meds.filter((m) => m.name).length === 0 ? (
          <Text style={[Type.small, { color: p.muted }]}>No medicines saved.</Text>
        ) : (
          meds.filter((m) => m.name).map((m, i) => <Reading key={`${m.name}-${i}`} label={m.name ?? ''} value={m.dose} styles={styles} />)
        )}
      </Section>

      {/* Medical history entries */}
      {/* Medical history entries, read only: ten at a time, and "Show more" loads the next page. */}
      <Section title="Health log" p={p} styles={styles}>
        {historyEntries.length === 0 && !historyPages.isFetching ? (
          <Text style={[Type.small, { color: p.muted }]}>No entries yet.</Text>
        ) : (
          historyEntries.map((entry) => (
            <View key={entry.id} style={styles.historyEntry}>
              <View style={styles.historyTop}>
                <Text style={[Type.bodyStrong, styles.flex, { color: p.text }]}>{entry.title}</Text>
                <Text style={[Type.small, { color: p.muted }]}>{entry.occurred_on}</Text>
              </View>
              {entry.medicines.filter((m) => m.name).length > 0 ? (
                <Text style={[Type.small, { color: p.muted }]}>
                  {entry.medicines.filter((m) => m.name).map((m) => (m.dose ? `${m.name} (${m.dose})` : m.name)).join(', ')}
                </Text>
              ) : null}
            </View>
          ))
        )}
        {historyPages.hasNextPage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show more health log entries"
            disabled={historyPages.isFetchingNextPage}
            onPress={() => void historyPages.fetchNextPage()}
            style={styles.more}>
            <Text style={[Type.label, { color: p.accent }]}>{historyPages.isFetchingNextPage ? 'Loading…' : 'Show more'}</Text>
            <Ionicons name="chevron-down" size={14} color={p.accent} />
          </Pressable>
        ) : null}
      </Section>
    </View>
  );
}

// The reports shown at first, and how many more each "Show more" adds.
const REPORTS_PER_STEP = 10;

// The same words the dashboard uses for the score and the parts, so the family view reads the same as the app.
function overallLabel(score: number | null): string {
  if (score === null) return "Let's get started";
  if (score >= 70) return 'Good Health!';
  if (score >= 40) return 'Keep Improving';
  return 'Needs Attention';
}

// The palette has no warning colour: a good score uses the accent, a middling one the strong text, a low one the red.
function bandColor(score: number | null, p: Palette): string {
  if (score === null) return p.muted;
  if (score >= 70) return p.accent;
  if (score >= 40) return p.textStrong;
  return p.red;
}

// The status words of the part cards: Normal, Watch, Critical, or No data when nothing is saved.
function partText(score: number | null): string {
  if (score === null) return 'No data';
  if (score >= 70) return 'Normal';
  if (score >= 40) return 'Watch';
  return 'Critical';
}

// A read-only part score: shown, not tappable.
function PartTile({ label, score, p, styles }: { label: string; score: number | null; p: Palette; styles: Styles }) {
  return (
    <View accessibilityLabel={`${label}: ${partText(score)}`} style={[styles.tile, { borderColor: p.border }]}>
      <Text style={[Type.label, { color: p.muted }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: bandColor(score, p) }]}>{partText(score)}</Text>
    </View>
  );
}

function Section({ title, p, styles, children }: { title: string; p: Palette; styles: Styles; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={[Type.heading, { color: p.textStrong }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Pair({ row, styles }: { row: Row; styles: Styles }) {
  return (
    <View style={styles.pairRow}>
      <Text style={styles.pairLabel}>{row.label}</Text>
      <Text style={styles.pairValue}>{row.value ?? '–'}</Text>
    </View>
  );
}

function Reading({ label, value, styles }: { label: string; value: string | null | undefined; styles: Styles }) {
  return (
    <View style={styles.pairRow}>
      <Text style={styles.pairLabel}>{label}</Text>
      <Text style={styles.pairValue}>{value ?? '–'}</Text>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(p: Palette) {
  return StyleSheet.create({
    wrap: { gap: 14 },
    flex: { flex: 1 },
    identity: { gap: 2 },
    card: { borderRadius: 18, borderWidth: 1, borderColor: p.border, backgroundColor: p.card, padding: 16, gap: 10 },
    half: { flex: 1 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    scoreMeta: { flex: 1, gap: 8 },
    bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3 },
    parts: { flexDirection: 'row', gap: 10 },
    tile: { flex: 1, minWidth: 0, borderRadius: 16, borderWidth: 1, padding: 12, gap: 6, backgroundColor: p.card },
    tileValue: { ...Type.bodyStrong, fontSize: 18 },
    stack: { gap: 14 },
    sectionBody: { gap: 0 },
    line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: Rule, borderBottomColor: p.border },
    pairRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: Rule, borderBottomColor: p.border },
    pairLabel: { ...Type.small, color: p.muted, flexShrink: 1 },
    pairValue: { ...Type.bodyStrong, color: p.textStrong, textAlign: 'right', flexShrink: 1 },
    more: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 12 },
    historyEntry: { gap: 4, paddingVertical: 10, borderBottomWidth: Rule, borderBottomColor: p.border },
    historyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  });
}
