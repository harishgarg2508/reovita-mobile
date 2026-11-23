import { useRouter } from 'expo-router';
import { goBackOr } from '@shared/ui';
import { useEffect, useMemo, useState, useRef, type ComponentRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReportDraft, useReportInterpretation, useReportStatus } from '@entities/report';
import { useRefreshNotificationsWhen } from '@entities/notification';
import { isApiError } from '@shared/api';
import { DISCLAIMER_V1 } from '@shared/config/constants';
import { Chip } from '@shared/ui/chip';
import { Skeleton } from '@shared/ui/skeleton';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';
import { useScrollToTopOnFocus } from '@shared/lib';

const STATUS_COLOR: Record<string, string> = {
  Normal: '#1E6B45',
  Watch: '#8A6A12',
  High: '#C22F43',
  Low: '#C22F43',
  Critical: '#C22F43',
};

const OUT_OF_RANGE = ['High', 'Low', 'Critical'];

// The small box behind the info icon of a result outside its range: which test it is, in which report, and by how much.
function OutsideRangeInfo({ observation, status, styles }: { observation: { name_raw: string; value_num: number; unit: string; ref_low?: number | null; ref_high?: number | null; collected_on?: string } | undefined; status?: string; styles: ReturnType<typeof createStyles> }) {
  if (!observation) return <Text style={styles.infoBox}>This result is {status?.toLowerCase()} in this report.</Text>;
  const range =
    observation.ref_low != null && observation.ref_high != null
      ? `${observation.ref_low}–${observation.ref_high} ${observation.unit}`
      : observation.ref_high != null
        ? `up to ${observation.ref_high} ${observation.unit}`
        : observation.ref_low != null
          ? `from ${observation.ref_low} ${observation.unit}`
          : null;
  const date = observation.collected_on ? new Date(observation.collected_on).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  return (
    <Text style={styles.infoBox}>
      {observation.name_raw} is {status?.toLowerCase()} in this report{date ? ` (${date})` : ''}. Your value is {observation.value_num} {observation.unit}
      {range ? `, and the range given is ${range}` : ''}.
    </Text>
  );
}

// Interpretation of one report, read directly from GET /v1/health/reports/{id}/interpretation.
export function InterpretationScreen({ reportId }: { reportId: string }) {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Pipeline order: upload, then observations, then confirm, then interpretation. The status comes first.
  // The interpretation exists only after confirmation, so it is requested only for those states.
  const status = useReportStatus(reportId);
  const confirmed = status === 'INTERPRETING' || status === 'DONE';
  // The status arrives over a live stream a moment after the screen opens, and until it does it is null. The explanation is asked for
  // in that moment too: the user pressed View analysis because it is ready, and waiting for the stream would only delay it.
  const interpretation = useReportInterpretation(reportId, { enabled: confirmed || status === null });

  // Not confirmed yet (or needs the user): the review screen handles observations, confirm and retakes.
  const needsReview = status === 'AWAITING_CONFIRMATION' || status === 'NEEDS_RETAKE' || status === 'FAILED';
  // While the interpretation is being written, "not found" is expected: show the analysing state instead.
  const analysing = status === 'INTERPRETING' && !interpretation.data;
  // "Not found" only sends the user back once the status is known. Before that, an old "not found" kept from earlier (while the report
  // was still being analysed) would wrongly look like "not confirmed" and bounce the screen back to the review the moment it opened.
  const notConfirmed = status !== null && status !== 'INTERPRETING' && status !== 'DONE' && isApiError(interpretation.error, 'interpretation_not_found');
  // When the status reaches DONE, fetch the saved interpretation once.
  useEffect(() => {
    if (status === 'DONE') void interpretation.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => {
    if (needsReview || notConfirmed) {
      router.replace({ pathname: '/(app)/reports/[id]', params: { id: reportId } });
    }
  }, [needsReview, notConfirmed, reportId, router]);

  // The values of this report, so a result outside its range can say which test it is and how far out it is.
  const draft = useReportDraft(reportId, { enabled: confirmed });
  useRefreshNotificationsWhen(interpretation.isSuccess || draft.isSuccess);
  const observations = draft.data ?? [];
  // The result whose info box is open.
  const [infoOpen, setInfoOpen] = useState<string | null>(null);

  const output = interpretation.data?.output_json;
  // A prescription, scan or other document is shown as what was read, with no results table and no preventive measures.
  const document = output?.document;
  const explanations = (output?.explanations ?? []) as { text: string; status?: string; biomarker_code?: string }[];

  const errorText = analysing || (interpretation.isFetching && !interpretation.data) ? null : interpretation.isError
    ? isApiError(interpretation.error, 'interpretation_not_found')
      ? 'This report has no explanation yet.'
      : isApiError(interpretation.error, 'report_not_found')
        ? 'This report could not be found.'
        : 'We could not load the explanation. Try again.'
    : null;

  return (
    <ScrollView ref={scrollRef}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20) + 8,
          paddingBottom: Math.max(insets.bottom, 20) + 16,
        },
      ]}>
      <View style={styles.headerBar}>
        <Pressable accessibilityRole="button" onPress={() => goBackOr(router, '/(app)/(tabs)/dashboard')} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{document ? 'Document summary' : 'Interpretation'}</Text>
        <View style={styles.backBtn} />
      </View>

      {interpretation.isLoading || (interpretation.isFetching && !interpretation.data) ? (
        <>
          <Skeleton height={96} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </>
      ) : null}

      {analysing ? <Text style={styles.error}>Your report is being analysed. This can take a minute.</Text> : null}
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

      {output?.summary ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>
          <Text style={styles.body}>{output.summary}</Text>
        </View>
      ) : null}

      {document && document.items.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is written</Text>
          {document.items.map((item, index) => (
            <View key={`${index}-${item.title}`} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.detail ? <Text style={styles.body}>{item.detail}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {document && document.unclear.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hard to read</Text>
          <Text style={styles.note}>These parts could not be read with confidence. Please check them with the person who wrote the document.</Text>
          {document.unclear.map((line, index) => (
            <View key={`${index}-${line}`} style={styles.card}>
              <Text style={styles.body}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!document && explanations.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Results</Text>
          {explanations.map((item, index) => (
            <View key={`${item.biomarker_code ?? 'item'}-${index}`} style={styles.card}>
              {item.status || item.biomarker_code ? (
                <View style={styles.cardHeader}>
                  <View style={styles.statusRow}>
                    {item.status ? (
                      <Text style={[styles.status, { color: STATUS_COLOR[item.status] ?? '#171717' }]}>{item.status}</Text>
                    ) : null}
                    {item.status && OUT_OF_RANGE.includes(item.status) ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Which result is outside the range"
                        hitSlop={8}
                        onPress={() => setInfoOpen(infoOpen === `${index}` ? null : `${index}`)}>
                        <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
                      </Pressable>
                    ) : null}
                  </View>
                  {item.biomarker_code ? (
                    <Chip label={item.biomarker_code} selected={false} onPress={() => undefined} />
                  ) : null}
                </View>
              ) : null}
              {infoOpen === `${index}` ? <OutsideRangeInfo observation={observations.find((o) => o.biomarker_code === item.biomarker_code)} status={item.status} styles={styles} /> : null}
              <Text style={styles.body}>{item.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!document && output?.action_points && output.action_points.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preventive measures</Text>
          <Text style={styles.note}>General habits that support your health. They are not medical advice, and a doctor can guide you on your own results.</Text>
          {output.action_points.map((point, index) => (
            <View key={`${index}-${point}`} style={styles.card}>
              <Text style={styles.body}>{point}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {interpretation.data ? <Text style={styles.disclaimer}>{DISCLAIMER_V1}</Text> : null}
    </ScrollView>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 24,
    backgroundColor: colors.bg,
    flexGrow: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  section: { gap: 4 },
  sectionTitle: {
    fontSize: 19,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  // A finding is a row on a thin rule, not a box.
  card: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { fontSize: 12.5, lineHeight: 18, color: colors.muted },
  infoBox: { fontSize: 12.5, lineHeight: 18, color: colors.text, backgroundColor: colors.accentSoft, borderRadius: 12, padding: 12 },
  status: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  code: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.muted,
    letterSpacing: 0,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  error: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    marginTop: 8,
  },
});
