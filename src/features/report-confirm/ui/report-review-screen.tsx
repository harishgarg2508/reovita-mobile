import { svgDataUri } from '@shared/lib';
import { USE_NATIVE_DRIVER } from '@shared/lib';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { goBackOr } from '@shared/ui';
import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isReportReady, useConfirmedReport, useReportDraft, useReportInterpretation, useReportStatus } from '@entities/report';
import { LlmConsentSheet, useGrantLlmConsent } from '@entities/consent';
import { isApiError } from '@shared/api';
import { ReportProcessingPanel } from '@shared/ui/processing-panel';
import {
  BottomWaveMist,
  ReviewInfoIcon,
} from '@shared/ui';
import { tapConfirm } from '@shared/lib';
import { Skeleton } from '@shared/ui/skeleton';
import { ExplanationCard } from '@shared/ui/explanation-card';
import { CelebrationCheck } from '@shared/ui/celebration-check';

import { useConfirmReport } from '../model/use-confirm-report';
import { ReportNotReadablePanel } from './report-not-readable-panel';

// Shown while OCR is still running (the server answers 409 report_processing until then).
const loadingStyles = StyleSheet.create({
  container: { gap: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#171717' },
  subtitle: { fontSize: 14, color: '#60646C' },
  error: { fontSize: 14, color: '#C22F43' },
});

const HERO_CHART_SVG = `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="80" cy="80" r="76" fill="#F4EFFE" />
  <rect x="52" y="74" width="8" height="22" rx="4" fill="#1F6F3F" />
  <rect x="65" y="44" width="8" height="52" rx="4" fill="#1F6F3F" />
  <rect x="78" y="62" width="8" height="34" rx="4" fill="#1F6F3F" />
  <rect x="91" y="52" width="8" height="44" rx="4" fill="#1F6F3F" />
  <circle cx="103" cy="91" r="13" fill="#F4EFFE" />
  <line x1="109" y1="97" x2="119" y2="107" stroke="#F4EFFE" stroke-width="7" stroke-linecap="round" />
  <circle cx="103" cy="91" r="10" stroke="#1F6F3F" stroke-width="3" fill="#F4EFFE" />
  <line x1="109" y1="97" x2="119" y2="107" stroke="#1F6F3F" stroke-width="3.2" stroke-linecap="round" />
</svg>`;
const HERO_CHART_URI = svgDataUri(HERO_CHART_SVG);

const SPINNER_RING_SVG = `<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="22" cy="22" r="18" stroke="#EDE8F8" stroke-width="3.5" fill="none" />
  <path d="M 22 4 A 18 18 0 0 1 40 22" stroke="#1F6F3F" stroke-width="3.5" stroke-linecap="round" fill="none" />
</svg>`;
const SPINNER_RING_URI = svgDataUri(SPINNER_RING_SVG);

const DIAMOND_STAR_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 0 C12 6.6 6.6 12 0 12 C6.6 12 12 17.4 12 24 C12 17.4 17.4 12 24 12 C17.4 12 12 6.6 12 0 Z" fill="#5CC47F" />
</svg>`;
const DIAMOND_STAR_URI = svgDataUri(DIAMOND_STAR_SVG);

/**
 * Reovita Review Results & AI Translation Flow.
 * Exact recreation of Image 1, Image 2, and Image 3 with rich animations:
 * - Screen 1: Review Results Table (2-column bordered grid with Hemoglobin, Cholesterol, Vitamin D)
 * - Screen 2: LLM is processing your results... (Sparkles halo & floating star over purple mist)
 * - Screen 3: Your Report is Ready! (Confetti check badge, "All Normal" pill, Health score wave, Key insights)
 */
// Listens to the report's status stream while the server interprets it. Renders nothing.
function WatchInterpretation({ reportId, onDone }: { reportId: string; onDone: () => void }) {
  const status = useReportStatus(reportId);
  useEffect(() => {
    if (status === 'DONE') onDone();
  }, [status, onDone]);
  return null;
}

export function ReportReviewScreen({ reportId }: { reportId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The confirm result is cached by useConfirmReport. Once it exists, observations are not requested again.
  const confirmed = useConfirmedReport(reportId);
  // Observations are requested directly (GET). Nothing streams them.
  // Live status from the event stream. Observations are requested only once the report is ready.
  // Observations are requested as soon as the screen opens. Nothing streams before that.
  const draft = useReportDraft(reportId, { enabled: !confirmed.data });
  // While the report is still processing, the event stream says when it is ready. Then the observations are requested once.
  const awaitingReport = isApiError(draft.error, 'report_processing');
  const readyStatus = useReportStatus(awaitingReport ? reportId : null);
  useEffect(() => {
    if (readyStatus !== null && isReportReady(readyStatus)) void draft.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyStatus]);
  const confirm = useConfirmReport();
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [simulatedAnalyzing, setSimulatedAnalyzing] = useState(false);
  const [showFinalReport, setShowFinalReport] = useState(false);
  // The interpretation is requested once the server reports DONE (see WatchInterpretation).
  const interpretationQuery = useReportInterpretation(reportId, { enabled: showFinalReport });
  const interpretation = interpretationQuery.data?.output_json;
  const [interpreting, setInterpreting] = useState(false);
  const onInterpretationDone = useCallback(() => {
    setInterpreting(false);
    setShowFinalReport(true);
  }, []);
  const explanations = (interpretation?.explanations ?? []) as { text: string; status?: string; biomarker_code?: string }[];
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  // Only the server's observations are shown. Until they arrive, the loading state is rendered below.
  const observations = confirmed.data?.observations ?? draft.data ?? [];
  const flaggedCount = observations.filter((obs) => obs.status !== 'Normal').length;

  // Editing happens on this screen. Edited rows replace the server rows, and Confirm sends them.
  const [editing, setEditing] = useState(false);
  const [editedRows, setEditedRows] = useState<typeof observations | null>(null);
  const rows = editedRows ?? observations;

  function editValue(index: number, text: string) {
    const parsed = Number(text.replace(',', '.'));
    if (!Number.isFinite(parsed)) return;
    setEditedRows(rows.map((row, i) => (i === index ? { ...row, value_num: parsed } : row)));
  }

  // Animation values for Screen 2 (Sparkles & Floating Mist Star & Spinner)
  const [sparkleScale] = useState(() => new Animated.Value(1));
  const [mistStarY] = useState(() => new Animated.Value(0));
  const [spinAnim] = useState(() => new Animated.Value(0));

  // Animation value for Screen 3 (Celebration Pop)
  const [celebrationScale] = useState(() => new Animated.Value(0.7));

  // Button spring press animations
  const [btnScale1] = useState(() => new Animated.Value(1));
  const [btnScale2] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (confirm.isPending || simulatedAnalyzing || interpreting) {
      // Looping pulse on sparkles halo
      const sparkleAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleScale, {
            toValue: 1.05,
            duration: 1300,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(sparkleScale, {
            toValue: 1,
            duration: 1300,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ])
      );
      sparkleAnim.start();

      // Looping bob on bottom mist star
      const mistStarAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(mistStarY, {
            toValue: -8,
            duration: 1400,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(mistStarY, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ])
      );
      mistStarAnim.start();

      // Looping continuous rotation for spinner ring
      const spinAnimation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: USE_NATIVE_DRIVER,
        })
      );
      spinAnimation.start();

      return () => {
        sparkleAnim.stop();
        mistStarAnim.stop();
        spinAnimation.stop();
      };
    }
  }, [confirm.isPending, simulatedAnalyzing, interpreting, sparkleScale, mistStarY, spinAnim]);

  useEffect(() => {
    if (showFinalReport) {
      Animated.spring(celebrationScale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  }, [showFinalReport, celebrationScale]);

  // Opens the AI consent sheet when the server says llm_processing consent is missing.
  const [llmSheetOpen, setLlmSheetOpen] = useState(false);
  const grantLlm = useGrantLlmConsent();

  function runConfirm() {
    setSimulatedAnalyzing(true);
    setConfirmError(null);

    confirm.mutate(
      { reportId, observations: rows },
      {
        // Keep the loading view until the confirm request answers. A 200 shows the result right away.
        onSuccess: () => {
          // The server interprets the report in the background. Keep the loading view until it is DONE.
          setSimulatedAnalyzing(false);
          setInterpreting(true);
        },
        onError: (err) => {
          setSimulatedAnalyzing(false);
          // The report was already confirmed (it is DONE): show its interpretation instead of an error.
          if (isApiError(err, 'invalid_report_state')) {
            router.replace({ pathname: '/(app)/reports/interpretation/[id]', params: { id: reportId } });
            return;
          }
          if (isApiError(err, 'llm_consent_required')) {
            setLlmSheetOpen(true);
            return;
          }
          // Any other failure: show the server's message so the user knows what to fix.
          setConfirmError(isApiError(err) ? err.message : 'Could not confirm the report. Try again.');
        },
      }
    );
  }

  function onConfirmValues() {
    tapConfirm();
    runConfirm();
  }

  async function onAllowLlm() {
    try {
      await grantLlm.mutateAsync();
    } catch {
      return; // The sheet stays open so the user can try again.
    }
    setLlmSheetOpen(false);
    runConfirm();
  }

  function onDeclineLlm() {
    setLlmSheetOpen(false);
  }

  function onPressIn(anim: Animated.Value) {
    Animated.spring(anim, { toValue: 0.97, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }

  function onPressOut(anim: Animated.Value) {
    Animated.spring(anim, { toValue: 1, tension: 80, friction: 5, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }

  if (isApiError(draft.error, 'report_not_readable')) {
    return <ReportNotReadablePanel reportId={reportId} />;
  }

  if (!confirmed.data && isApiError(draft.error, 'report_processing')) {
    return <ReportProcessingPanel onLater={() => goBackOr(router, '/(app)/(tabs)/dashboard')} />;
  }

  if (!confirmed.data && !draft.data && !draft.isError) {
    return <ReportProcessingPanel onLater={() => goBackOr(router, '/(app)/(tabs)/dashboard')} />;
  }

  if (!confirmed.data && !draft.data) {
    const failed = draft.isError;
    return (
      <ScrollView
        contentContainerStyle={[
          loadingStyles.container,
          {
            paddingHorizontal: 24,
            paddingTop: Math.max(insets.top, 20) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}>
        <Text style={loadingStyles.title}>Review Results</Text>
        {failed ? (
          <Text style={loadingStyles.error}>
            {isApiError(draft.error, 'report_not_readable')
              ? 'We could not read this report. Please upload it again.'
              : 'We could not load this report. Go back and try again.'}
          </Text>
        ) : (
          <>
            <Text style={loadingStyles.subtitle}>
              Reading your report. We&apos;ll notify you when your observations are ready.
            </Text>
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
          </>
        )}
      </ScrollView>
    );
  }

  // =========================================================================
  // SCREEN 2: LLM processing
  // =========================================================================
  if (confirm.isPending || simulatedAnalyzing || interpreting) {
    const spinInterpolate = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View
        style={[
          styles.screenCenter,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: insets.bottom,
          },
        ]}>
        <WatchInterpretation reportId={reportId} onDone={onInterpretationDone} />
        <View style={styles.centerHeroSection}>
          {/* Lavender circle with the analysis icon, gently pulsing */}
          <Animated.View style={[styles.aiLoadingHalo, { transform: [{ scale: sparkleScale }] }]}>
            <ExpoImage
              source={{ uri: HERO_CHART_URI }}
              style={styles.heroChartSvg}
              contentFit="contain"
            />
          </Animated.View>

          {/* Heading */}
          <Text style={styles.aiLoadingTitle}>
            Our LLM is <Text style={styles.aiLoadingAccent}>processing</Text>
            {'\n'}your results...
          </Text>
          <Text style={styles.aiLoadingSubtitle}>This may take a moment.</Text>

          {/* Smooth Animated Spinner Ring */}
          <View style={styles.spinnerWrap}>
            <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
              <ExpoImage
                source={{ uri: SPINNER_RING_URI }}
                style={styles.spinnerRing}
                contentFit="contain"
              />
            </Animated.View>
          </View>
        </View>

        {/* Signature Ethereal Wavy Purple Mist Backdrop */}
        <BottomWaveMist height={160} />
      </View>
    );
  }

  // =========================================================================
  // SCREEN 3: Final Analysis ("Your Report is Ready!")
  // =========================================================================
  if (showFinalReport) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 20,
          },
        ]}>
        {/* Celebration Confetti & Checkmark Badge */}
        <Animated.View
          style={[
            styles.celebrationWrapper,
            {
              transform: [{ scale: celebrationScale }],
            },
          ]}>
          <CelebrationCheck size={76} />
        </Animated.View>

        <Text style={styles.readyTitle}>Your Report is Ready!</Text>
        <Text style={styles.readySubtitle}>{"Here's what your results mean."}</Text>

        {/* "All Normal" Soft Lime Pill */}
        <View style={styles.allNormalPill}>
          <View style={styles.allNormalDot}>
            <View style={styles.allNormalInnerDot} />
          </View>
          <Text style={styles.allNormalText}>{flaggedCount === 0 ? 'All Normal' : `${flaggedCount} need attention`}</Text>
        </View>

        {/* Key Insights Section */}
        <View style={styles.insightsSection}>
          <Text style={styles.insightsTitle}>Key Insights</Text>

          {interpretation?.summary ? <Text style={styles.insightText}>{interpretation.summary}</Text> : null}
        </View>

        {/* Explanation for each result */}
        {explanations.length > 0 ? (
          <View style={styles.insightsSection}>
            <Text style={styles.insightsTitle}>Explanation</Text>
            {explanations.map((item, index) => (
              <ExplanationCard
                key={`${item.biomarker_code ?? 'item'}-${index}`}
                status={item.status}
                biomarkerCode={item.biomarker_code}
                text={item.text}
              />
            ))}
          </View>
        ) : null}

        {/* Action points, after the explanations */}
        {(interpretation?.action_points ?? []).length > 0 ? (
          <View style={styles.insightsSection}>
            <Text style={styles.insightsTitle}>Action points</Text>
            {(interpretation?.action_points ?? []).map((point) => (
              <View key={point} style={styles.insightItem}>
                <View style={styles.greenCheckCircle}>
                  <Text style={styles.greenCheckText}>✓</Text>
                </View>
                <Text style={styles.insightText}>{point}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Detailed Breakdown Toggle */}
        {showDetailedBreakdown && (
          <View style={styles.detailedSection}>
            <Text style={styles.insightsTitle}>Extracted Values</Text>
            {observations.map((obs, idx) => (
              <View key={idx} style={styles.detailedRow}>
                <Text style={styles.detailedName}>{obs.name_raw}</Text>
                <Text style={styles.detailedVal}>
                  {obs.value_num} {obs.unit}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionColumn}>
          {/* Primary View Detailed Report Button */}
          <Animated.View style={{ transform: [{ scale: btnScale1 }] }}>
            <Pressable
              accessibilityRole="button"
              onPressIn={() => onPressIn(btnScale1)}
              onPressOut={() => onPressOut(btnScale1)}
              onPress={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
              style={styles.primaryReportBtn}>
              <Text style={styles.primaryReportBtnText}>
                {showDetailedBreakdown ? 'Hide Detailed Report' : 'View Detailed Report'}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Secondary Back to Dashboard Button */}
          <Animated.View style={{ transform: [{ scale: btnScale2 }] }}>
            <Pressable
              accessibilityRole="button"
              onPressIn={() => onPressIn(btnScale2)}
              onPressOut={() => onPressOut(btnScale2)}
              onPress={() => router.replace('/(app)/(tabs)/dashboard')}
              style={styles.secondaryDashboardBtn}>
              <Text style={styles.secondaryDashboardBtnText}>Back to Dashboard</Text>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    );
  }

  // =========================================================================
  // SCREEN 1: Review Results / Observation Table
  // =========================================================================
  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20) + 8,
          paddingBottom: Math.max(insets.bottom, 20) + 16,
        },
      ]}>
      {/* Header Bar: ← Review Results */}
      <View style={styles.headerBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => goBackOr(router, '/(app)/(tabs)/dashboard')}
          style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Review Results</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Info Callout Card with purple "i" badge */}
      <View style={styles.infoCallout}>
        <View style={styles.infoIconCol}>
          <ReviewInfoIcon size={34} />
        </View>
        <View style={styles.infoTextCol}>
          <Text style={styles.infoTitle}>We found these values.</Text>
          <Text style={styles.infoSubtitle}>Please verify them.</Text>
        </View>
      </View>

      {/* 2-Column Observation Table Card with dividers */}
      <View style={styles.tableCard}>
        {rows.map((obs, index) => {
          const isLast = index === rows.length - 1;
          return (
            <View
              key={`${obs.biomarker_code}-${index}`}
              style={[styles.tableRow, !isLast && styles.tableRowBorder]}>
              {/* Left Column: Biomarker Name */}
              <View style={styles.nameColumn}>
                <Text style={styles.biomarkerName}>{obs.name_raw}</Text>
              </View>

              {/* Vertical Column Divider */}
              <View style={styles.columnDivider} />

              {/* Right Column: Extracted Value */}
              <View style={styles.valueColumn}>
                {editing ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TextInput
                      defaultValue={String(obs.value_num)}
                      onChangeText={(text) => editValue(index, text)}
                      keyboardType="decimal-pad"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 15,
                        fontWeight: '600',
                        color: '#171717',
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderWidth: 1.5,
                        borderColor: '#1F6F3F',
                        borderRadius: 10,
                        backgroundColor: '#F8F5FF',
                      }}
                    />
                    <Text style={styles.biomarkerValue}>{obs.unit}</Text>
                  </View>
                ) : (
                  <Text style={styles.biomarkerValue}>
                    {obs.value_num} {obs.unit}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Dual Action Buttons: [ Edit ] and [ Confirm ] */}
      {status === 'DONE' ? (
        <View style={styles.dualActionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace({ pathname: '/(app)/reports/interpretation/[id]', params: { id: reportId } })}
            style={[styles.confirmBtn, { flex: 1 }]}>
            <Text style={styles.confirmBtnText}>View analysis</Text>
          </Pressable>
        </View>
      ) : (
      <View style={styles.dualActionRow}>
        <Animated.View style={[{ flex: 1 }, { transform: [{ scale: btnScale1 }] }]}>
          <Pressable
            accessibilityRole="button"
            onPressIn={() => onPressIn(btnScale1)}
            onPressOut={() => onPressOut(btnScale1)}
            onPress={() => setEditing((value) => !value)}
            style={styles.editBtn}>
            <Text style={styles.editBtnText}>{editing ? 'Done' : 'Edit'}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={[{ flex: 1 }, { transform: [{ scale: btnScale2 }] }]}>
          <Pressable
            accessibilityRole="button"
            onPressIn={() => onPressIn(btnScale2)}
            onPressOut={() => onPressOut(btnScale2)}
            onPress={onConfirmValues}
            style={styles.confirmBtn}>
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </Pressable>
        </Animated.View>
      </View>
      )}
      {confirmError ? <Text style={[styles.confirmError, { color: '#C22F43' }]}>{confirmError}</Text> : null}
      <LlmConsentSheet
        visible={llmSheetOpen}
        pending={grantLlm.isPending}
        onAllow={onAllowLlm}
        onDecline={onDeclineLlm}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  aiLoadingHalo: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroChartSvg: {
    width: 160,
    height: 160,
  },
  aiLoadingAccent: {
    color: '#1F6F3F',
    fontFamily: 'Poppins_700Bold',
  },
  container: {
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  screenCenter: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#171717',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#171717',
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEFD',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
    gap: 14,
  },
  infoIconCol: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextCol: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#60646C',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E3FA',
    borderRadius: 18,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECFA',
  },
  nameColumn: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  columnDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#F0ECFA',
  },
  valueColumn: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  biomarkerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171717',
  },
  biomarkerValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171717',
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 36,
    paddingBottom: 8,
  },
  editBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.8,
    borderColor: '#1F6F3F',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F6F3F',
  },
  confirmBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1F6F3F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F6F3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmError: { fontFamily: 'Poppins_500Medium', fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 10 },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centerHeroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 1,
    paddingBottom: 40,
  },
  sparklesWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  aiLoadingTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: '#171717',
    textAlign: 'center',
    lineHeight: 35,
    letterSpacing: -0.3,
    marginTop: 26,
  },
  aiLoadingSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.1,
  },
  spinnerWrap: {
    marginTop: 26,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  spinnerRing: {
    width: 40,
    height: 40,
  },
  floatingStarWrap: {
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  diamondStar: {
    width: 22,
    height: 22,
  },
  celebrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 4,
  },
  readyTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#171717',
    textAlign: 'center',
    marginBottom: 6,
  },
  readySubtitle: {
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
    marginBottom: 18,
  },
  allNormalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#EBF9D5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 20,
  },
  allNormalDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#65A30D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allNormalInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  allNormalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#365314',
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FCF2',
    borderWidth: 1.5,
    borderColor: '#E4F1D2',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 22,
  },
  scoreCol: {
    justifyContent: 'center',
  },
  scoreCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 4,
  },
  scoreNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  scoreBig: {
    fontSize: 38,
    fontWeight: '800',
    color: '#171717',
    letterSpacing: -1,
  },
  scoreUpArrow: {
    fontSize: 18,
    fontWeight: '800',
    color: '#84CC16',
  },
  scoreDenominator: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E929A',
  },
  sparklineCol: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightsSection: {
    gap: 12,
    marginBottom: 26,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#171717',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greenCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#84CC16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenCheckText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  insightText: {
    fontSize: 14,
    color: '#171717',
    fontWeight: '500',
    flex: 1,
  },
  detailedSection: {
    backgroundColor: '#F9F8FD',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginBottom: 20,
  },
  detailedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailedName: {
    fontSize: 13,
    color: '#60646C',
  },
  detailedVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#171717',
  },
  actionColumn: {
    gap: 12,
    marginTop: 'auto',
    paddingBottom: 6,
  },
  primaryReportBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1F6F3F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F6F3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryReportBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryDashboardBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryDashboardBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171717',
  },
});
