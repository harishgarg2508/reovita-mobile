import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReportAuditLogs, type ReportAuditLog } from '@entities/report';
import { goBackOr } from '@shared/ui';
import { usePalette, type Palette } from '@shared/ui/theme';

// Human names for the stages and events the server writes. Anything not listed shows its raw name.
const STAGE_NAME: Record<string, string> = {
  upload: 'Upload',
  ocr: 'Reading values',
  review: 'Review',
  confirm: 'Confirmation',
  interpret: 'Interpretation',
  retry: 'Retry',
  replace: 'Replacement',
  delete: 'Deletion',
};

const EVENT_NAME: Record<string, string> = {
  stored: 'File stored',
  queued: 'Queued for reading',
  picked_up: 'Reading picked up',
  read_started: 'Reading started',
  read_completed: 'Values read',
  fallback_used: 'Fallback used',
  needs_retake: 'Needs a retake',
  failed: 'Failed',
  skipped: 'Skipped',
  confirmed: 'Values confirmed',
  refused: 'Refused',
  queue_failed: 'Could not queue',
  interpretation_generated: 'Analysis saved',
  interpretation_requested: 'Analysis opened',
  observations_requested: 'Values opened',
  retry_scheduled: 'Retry scheduled',
  returned_to_review: 'Sent back to review',
  consent_revoked: 'AI consent withdrawn',
  duplicate: 'Duplicate file',
  rejected: 'Rejected',
  superseded: 'Replaced by a newer file',
  deleted: 'Deleted',
};

// What a code means, in plain words. Shown under the step when the server stored one.
const CODE_NAME: Record<string, string> = {
  interpretation_failed: 'The analysis could not be finished',
  llm_consent_required: 'AI analysis consent is missing',
  llm_unavailable: 'The reading service was unavailable',
  llm_failed: 'The reading service could not read the report',
  ocr_unreadable: 'No lab values could be read',
  kb_unavailable: 'No active knowledge base version',
  invalid_report_state: 'The report is not in a state that allows this',
};

type Tone = 'ok' | 'error' | 'info';

interface TimelineStep {
  id: string;
  stage: string;
  event: string;
  status: Tone;
  detail: ReportAuditLog['detail'];
  created_at: string;
  // How many identical steps in a row this one stands for (for example repeated opens).
  count: number;
}

// Runs of the same stage and event, one after another, become one step with a count.
function toSteps(logs: ReportAuditLog[]): TimelineStep[] {
  const steps: TimelineStep[] = [];
  for (const log of logs) {
    const last = steps[steps.length - 1];
    if (last && last.stage === log.stage && last.event === log.event && last.status === log.status) {
      last.count += 1;
      continue;
    }
    steps.push({ id: log.id, stage: log.stage, event: log.event, status: log.status, detail: log.detail ?? {}, created_at: log.created_at, count: 1 });
  }
  return steps;
}

type Row = { kind: 'day'; key: string; label: string } | { kind: 'step'; key: string; step: TimelineStep; first: boolean; last: boolean };

// Splits the steps into rows, with a header row at each new day. The first and last step of a day know where the rail starts and ends.
function toRows(steps: TimelineStep[]): Row[] {
  const rows: Row[] = [];
  let day = '';
  steps.forEach((step, index) => {
    const label = dayLabel(step.created_at);
    if (label !== day) {
      day = label;
      rows.push({ kind: 'day', key: `day-${step.id}`, label });
    }
    const next = steps[index + 1];
    const sameDayAfter = next !== undefined && dayLabel(next.created_at) === label;
    const sameDayBefore = index > 0 && dayLabel(steps[index - 1].created_at) === label;
    rows.push({ kind: 'step', key: step.id, step, first: !sameDayBefore, last: !sameDayAfter });
  });
  return rows;
}

// Shows the history of one report as a timeline: each step, when it happened, and whether it succeeded.
export function ReportAuditScreen({ reportId }: { reportId: string }) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logs = useReportAuditLogs(reportId);
  const rows = useMemo(() => {
    const items = (logs.data?.pages ?? []).flatMap((page) => page?.items ?? []).filter((item): item is ReportAuditLog => !!item?.id);
    return toRows(toSteps(items));
  }, [logs.data]);

  return (
    <View style={[styles.container, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => goBackOr(router, '/(app)/reports/list')}
          hitSlop={8}
          style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={p.textStrong} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Report timeline</Text>
          <Text style={styles.subtitle}>Every step this report went through, newest first.</Text>
        </View>
      </View>

      {logs.isLoading ? (
        <ActivityIndicator color={p.accent} style={styles.center} />
      ) : logs.isError ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Could not load the timeline</Text>
          <Pressable accessibilityRole="button" onPress={() => logs.refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (logs.hasNextPage && !logs.isFetchingNextPage) void logs.fetchNextPage();
          }}
          ListEmptyComponent={<Text style={styles.muted}>No steps recorded for this report.</Text>}
          ListFooterComponent={logs.isFetchingNextPage ? <ActivityIndicator color={p.accent} style={styles.center} /> : undefined}
          renderItem={({ item }) =>
            item.kind === 'day' ? (
              <Text style={styles.day}>{item.label}</Text>
            ) : (
              <TimelineItem step={item.step} first={item.first} last={item.last} p={p} />
            )
          }
        />
      )}
    </View>
  );
}

function TimelineItem({ step, first, last, p }: { step: TimelineStep; first: boolean; last: boolean; p: Palette }) {
  const styles = makeStyles(p);
  const tone = TONE[step.status] ?? TONE.info;
  const color = tone === 'error' ? p.red : tone === 'ok' ? p.accent : p.muted;
  const icon: keyof typeof Ionicons.glyphMap = tone === 'error' ? 'alert-circle' : tone === 'ok' ? 'checkmark-circle' : 'ellipse';
  const reason = typeof step.detail.code === 'string' ? CODE_NAME[step.detail.code] ?? step.detail.code : null;
  const facts = factsLine(step.detail);

  return (
    <View style={styles.item}>
      {/* The rail: a line through the dot, cut at the first and last step of each day. */}
      <View style={styles.rail}>
        <View style={[styles.line, first && styles.lineFromDot, last && styles.lineToDot, !first && !last && styles.lineFull]} />
        <View style={[styles.dot, { borderColor: color, backgroundColor: tone === 'info' ? p.card : color }]}>
          {tone === 'info' ? null : <Ionicons name={icon} size={10} color="#FFFFFF" />}
        </View>
      </View>
      <View style={[styles.card, tone === 'error' && { borderColor: p.red }]}>
        <View style={styles.cardTop}>
          <Text style={styles.stepTitle}>
            {EVENT_NAME[step.event] ?? step.event}
            {step.count > 1 ? <Text style={styles.count}>  ×{step.count}</Text> : null}
          </Text>
          <Text style={styles.time}>{timeOf(step.created_at)}</Text>
        </View>
        <Text style={styles.stage}>{STAGE_NAME[step.stage] ?? step.stage}</Text>
        {reason ? <Text style={[styles.reason, { color }]}>{reason}</Text> : null}
        {facts ? <Text style={styles.facts}>{facts}</Text> : null}
      </View>
    </View>
  );
}

const TONE: Record<string, Tone> = { ok: 'ok', error: 'error', info: 'info' };

// "3 files, 2 pages" style facts. Only plain counts and flags are shown; codes are explained above.
function factsLine(detail: ReportAuditLog['detail']): string {
  return Object.entries(detail ?? {})
    .filter(([key, value]) => key !== 'code' && value !== null && value !== '' && value !== false)
    .map(([key, value]) => (value === true ? key.replace(/_/g, ' ') : `${key.replace(/_/g, ' ')}: ${String(value)}`))
    .join('  ·  ');
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function timeOf(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

const DOT = 14;
const RAIL = 28;

function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    back: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: p.border, backgroundColor: p.card, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 },
    title: { fontSize: 22, fontWeight: '800', color: p.textStrong },
    subtitle: { fontSize: 13, color: p.muted, marginTop: 2 },
    list: { paddingTop: 4 },
    day: { fontSize: 13, fontWeight: '700', color: p.muted, marginTop: 14, marginBottom: 6, marginLeft: RAIL },
    item: { flexDirection: 'row', alignItems: 'stretch' },
    rail: { width: RAIL, alignItems: 'center' },
    line: { position: 'absolute', left: RAIL / 2 - 1, width: 2, backgroundColor: p.border, top: 0, bottom: 0 },
    lineFromDot: { top: DOT / 2 + 6, bottom: 0 },
    lineToDot: { top: 0, bottom: undefined, height: DOT / 2 + 6 + 0 },
    lineFull: { top: 0, bottom: 0 },
    dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2, marginTop: 14, alignItems: 'center', justifyContent: 'center' },
    card: { flex: 1, marginBottom: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: p.border, backgroundColor: p.card, gap: 3 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    stepTitle: { flex: 1, fontSize: 14.5, fontWeight: '700', color: p.textStrong },
    count: { fontWeight: '600', color: p.muted },
    time: { fontSize: 12, color: p.muted },
    stage: { fontSize: 12, fontWeight: '600', color: p.accent },
    reason: { fontSize: 12.5, marginTop: 2 },
    facts: { fontSize: 12, color: p.muted, marginTop: 2 },
    muted: { fontSize: 12.5, color: p.muted, marginLeft: RAIL },
    center: { paddingVertical: 40, alignItems: 'center' },
    retry: { height: 44, borderRadius: 14, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    retryText: { color: '#FFFFFF', fontWeight: '700' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: p.textStrong },
    // retained so the card title style above stays in use for the error card
  });
}
