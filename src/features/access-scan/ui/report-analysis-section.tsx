import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette, type Palette } from '@shared/ui/theme';

import { fetchAccessReport, type AccessReportDetail, type AccessReportItem } from '../model/access-api';

// Colour of a result's status. Normal is green; Watch is amber; High, Low and Critical are red.
function statusColor(status: string): string {
  if (status === 'Normal') return '#1F7A3E';
  if (status === 'Watch') return '#B26A00';
  return '#C22F43';
}

const formatDate = (date: string) => new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const rangeText = (low: number | null, high: number | null, unit: string): string => {
  if (low === null && high === null) return '-';
  if (low !== null && high !== null) return `${low}–${high} ${unit}`;
  return low !== null ? `≥ ${low} ${unit}` : `≤ ${high} ${unit}`;
};

type Detail = { state: 'loading' } | { state: 'error' } | { state: 'ready'; data: AccessReportDetail };

// The subject's finished lab reports. The list is light: a date and counts for each report, 10 at a time. The results of a report are
// fetched from the server only when that report is opened, and kept once fetched. The explanation written for a report is not
// fetched or shown here.
export function ReportAnalysisSection({
  requestId,
  reports,
  hasMore,
  loading,
  onMore,
}: {
  requestId: string;
  reports: AccessReportItem[];
  hasMore: boolean;
  loading: boolean;
  onMore: () => void;
}) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  if (reports.length === 0) return null;

  async function load(reportId: string) {
    setDetails((current) => ({ ...current, [reportId]: { state: 'loading' } }));
    try {
      const data = await fetchAccessReport(requestId, reportId);
      setDetails((current) => ({ ...current, [reportId]: { state: 'ready', data } }));
    } catch {
      setDetails((current) => ({ ...current, [reportId]: { state: 'error' } }));
    }
  }

  function toggle(reportId: string) {
    if (open === reportId) {
      setOpen(null);
      return;
    }
    setOpen(reportId);
    // Fetched once. A failed fetch is tried again the next time the report is opened.
    if (details[reportId]?.state !== 'ready' && details[reportId]?.state !== 'loading') void load(reportId);
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Lab reports</Text>
      {reports.map((report) => {
        const expanded = open === report.id;
        const detail = details[report.id];
        return (
          <View key={report.id} style={styles.card}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => toggle(report.id)} style={styles.head}>
              <View style={styles.headIcon}>
                <Ionicons name="flask-outline" size={20} color={p.accent} />
              </View>
              <View style={styles.headText}>
                <Text style={styles.date}>{formatDate(report.date)}</Text>
                <Text style={styles.sub}>
                  {report.results} results{report.flagged > 0 ? ` · ${report.flagged} outside the range` : ' · all in range'}
                </Text>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={p.muted} />
            </Pressable>

            {expanded ? (
              <View style={styles.body}>
                {!detail || detail.state === 'loading' ? (
                  <View style={styles.center}>
                    <ActivityIndicator color={p.accent} />
                    <Text style={styles.sub}>Loading the results…</Text>
                  </View>
                ) : detail.state === 'error' ? (
                  <View style={styles.center}>
                    <Text style={styles.sub}>Could not load this report.</Text>
                    <Pressable accessibilityRole="button" onPress={() => void load(report.id)} style={styles.retry}>
                      <Text style={styles.moreText}>Try again</Text>
                    </Pressable>
                  </View>
                ) : (
                  <ReportDetail data={detail.data} p={p} styles={styles} />
                )}
              </View>
            ) : null}
          </View>
        );
      })}
      {hasMore ? (
        <Pressable accessibilityRole="button" onPress={onMore} disabled={loading} style={styles.more}>
          {loading ? <ActivityIndicator size="small" color={p.accent} /> : <Text style={styles.moreText}>Show more</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function ReportDetail({ data, p, styles }: { data: AccessReportDetail; p: Palette; styles: Styles }) {
  return (
    <>
      <Text style={styles.label}>Results</Text>
      <View style={styles.table}>
        {data.observations.map((o, i) => (
          <View key={`${o.biomarker_code}-${i}`} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={styles.rowMain}>
              <Text style={styles.name} numberOfLines={2}>
                {o.name}
              </Text>
              <Text style={styles.range}>Range {rangeText(o.ref_low, o.ref_high, o.unit)}</Text>
            </View>
            <View style={styles.rowValue}>
              <Text style={styles.value}>
                {o.value} {o.unit}
              </Text>
              <Text style={[styles.status, { color: statusColor(o.status) }]}>{o.status}</Text>
            </View>
          </View>
        ))}
      </View>

    </>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    section: { gap: 10 },
    more: { alignSelf: 'flex-start', height: 38, minWidth: 140, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    moreText: { fontSize: 13, fontWeight: '700', color: p.accent },
    heading: { fontSize: 15, fontWeight: '800', color: p.textStrong },
    card: { borderRadius: 18, borderWidth: 1, borderColor: p.border, backgroundColor: p.card, overflow: 'hidden' },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    headIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' },
    headText: { flex: 1, gap: 1 },
    date: { fontSize: 14.5, fontWeight: '700', color: p.textStrong },
    sub: { fontSize: 12.5, color: p.muted },
    body: { gap: 10, paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border, paddingTop: 12 },
    center: { alignItems: 'center', gap: 8, paddingVertical: 14 },
    retry: { height: 36, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 12, fontWeight: '800', color: p.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
    table: { borderRadius: 12, borderWidth: 1, borderColor: p.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9 },
    rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
    rowMain: { flex: 1, gap: 1 },
    name: { fontSize: 13, fontWeight: '600', color: p.textStrong },
    range: { fontSize: 11.5, color: p.muted },
    rowValue: { alignItems: 'flex-end', gap: 1 },
    value: { fontSize: 13, fontWeight: '700', color: p.textStrong },
    status: { fontSize: 11.5, fontWeight: '800' },
  });
}
