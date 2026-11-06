import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useReportDraft,
  type Observation,
} from '@entities/report';
import {
  ConfettiCelebrationBadge,
  ReviewInfoIcon,
  SparklesHaloGraphic,
  SparklineGraphic,
} from '@shared/ui';
import { tapConfirm } from '@shared/lib';

import { useConfirmReport } from '../model/use-confirm-report';

const DEFAULT_MOCK_OBSERVATIONS: Observation[] = [
  {
    biomarker_code: 'hgb',
    name_raw: 'Hemoglobin',
    value_num: 14.2,
    unit: 'g/dL',
    status: 'Normal',
    source: 'ocr',
    confidence: 0.98,
  },
  {
    biomarker_code: 'chol',
    name_raw: 'Cholesterol',
    value_num: 180,
    unit: 'mg/dL',
    status: 'Normal',
    source: 'ocr',
    confidence: 0.95,
  },
  {
    biomarker_code: 'vit_d',
    name_raw: 'Vitamin D',
    value_num: 32,
    unit: 'ng/mL',
    status: 'Normal',
    source: 'ocr',
    confidence: 0.92,
  },
];

/**
 * Reovita Review Results & AI Translation Flow.
 * Exact recreation of Image 1, Image 2, and Image 3 with rich animations:
 * - Screen 1: Review Results Table (2-column bordered grid with Hemoglobin, Cholesterol, Vitamin D)
 * - Screen 2: Claude AI is translating your results... (Sparkles halo & floating star over purple mist)
 * - Screen 3: Your Report is Ready! (Confetti check badge, "All Normal" pill, Health score wave, Key insights)
 */
export function ReportReviewScreen({ reportId }: { reportId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = useReportDraft(reportId);
  const confirm = useConfirmReport();

  const [simulatedAnalyzing, setSimulatedAnalyzing] = useState(false);
  const [showFinalReport, setShowFinalReport] = useState(false);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  // Observations to show (use real draft or fallback to exact Figma reference values)
  const observations =
    draft.data && draft.data.length > 0
      ? draft.data
      : DEFAULT_MOCK_OBSERVATIONS;

  // Animation values for Screen 2 (Sparkles & Floating Mist Star)
  const [sparkleScale] = useState(() => new Animated.Value(1));
  const [mistStarY] = useState(() => new Animated.Value(0));

  // Animation value for Screen 3 (Celebration Pop)
  const [celebrationScale] = useState(() => new Animated.Value(0.7));

  // Button spring press animations
  const [btnScale1] = useState(() => new Animated.Value(1));
  const [btnScale2] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (confirm.isPending || simulatedAnalyzing) {
      // Looping pulse on sparkles halo
      const sparkleAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleScale, {
            toValue: 1.14,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleScale, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
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
            useNativeDriver: true,
          }),
          Animated.timing(mistStarY, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ])
      );
      mistStarAnim.start();

      return () => {
        sparkleAnim.stop();
        mistStarAnim.stop();
      };
    }
  }, [confirm.isPending, simulatedAnalyzing, sparkleScale, mistStarY]);

  useEffect(() => {
    if (showFinalReport) {
      Animated.spring(celebrationScale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [showFinalReport, celebrationScale]);

  function onConfirmValues() {
    tapConfirm();
    setSimulatedAnalyzing(true);

    confirm.mutate(
      { reportId, observations },
      {
        onSettled: () => {
          setTimeout(() => {
            setSimulatedAnalyzing(false);
            setShowFinalReport(true);
          }, 2400);
        },
      }
    );
  }

  function onPressIn(anim: Animated.Value) {
    Animated.spring(anim, { toValue: 0.97, useNativeDriver: true }).start();
  }

  function onPressOut(anim: Animated.Value) {
    Animated.spring(anim, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }).start();
  }

  // =========================================================================
  // SCREEN 2: AI Loading ("Claude AI is translating your results...")
  // =========================================================================
  if (confirm.isPending || simulatedAnalyzing) {
    return (
      <View
        style={[
          styles.screenCenter,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>
        <View style={styles.centerHeroSection}>
          {/* Animated Sparkles Halo Graphic */}
          <Animated.View
            style={[
              styles.sparklesWrap,
              {
                transform: [{ scale: sparkleScale }],
              },
            ]}>
            <SparklesHaloGraphic size={114} />
          </Animated.View>

          {/* Heading */}
          <Text style={styles.aiLoadingTitle}>
            Claude AI is{'\n'}translating your{'\n'}results...
          </Text>
          <Text style={styles.aiLoadingSubtitle}>This may take a moment.</Text>
        </View>

        {/* Ethereal Wavy Purple Mist & Floating Diamond Star at Bottom */}
        <View style={styles.mistContainer}>
          {/* Floating Diamond Star */}
          <Animated.View
            style={[
              styles.floatingStarWrap,
              {
                transform: [{ translateY: mistStarY }],
              },
            ]}>
            <Text style={styles.mistStarText}>✦</Text>
          </Animated.View>

          {/* Wavy Purple Mist Backdrop */}
          <View style={styles.wavyMistShape}>
            <View style={styles.mistCurve1} />
            <View style={styles.mistCurve2} />
          </View>
        </View>
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
          <ConfettiCelebrationBadge size={76} />
        </Animated.View>

        <Text style={styles.readyTitle}>Your Report is Ready!</Text>
        <Text style={styles.readySubtitle}>{"Here's what your results mean."}</Text>

        {/* "All Normal" Soft Lime Pill */}
        <View style={styles.allNormalPill}>
          <View style={styles.allNormalDot}>
            <View style={styles.allNormalInnerDot} />
          </View>
          <Text style={styles.allNormalText}>All Normal</Text>
        </View>

        {/* Health Score Card with Vector Green Wave Sparkline */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCol}>
            <Text style={styles.scoreCardLabel}>Health Score</Text>
            <View style={styles.scoreNumRow}>
              <Text style={styles.scoreBig}>92</Text>
              <Text style={styles.scoreUpArrow}>↑</Text>
              <Text style={styles.scoreDenominator}>/100</Text>
            </View>
          </View>

          {/* Green Bezier Trend Sparkline */}
          <View style={styles.sparklineCol}>
            <SparklineGraphic width={135} height={50} />
          </View>
        </View>

        {/* Key Insights Section */}
        <View style={styles.insightsSection}>
          <Text style={styles.insightsTitle}>Key Insights</Text>

          <View style={styles.insightItem}>
            <View style={styles.greenCheckCircle}>
              <Text style={styles.greenCheckText}>✓</Text>
            </View>
            <Text style={styles.insightText}>Your values are within normal range.</Text>
          </View>

          <View style={styles.insightItem}>
            <View style={styles.greenCheckCircle}>
              <Text style={styles.greenCheckText}>✓</Text>
            </View>
            <Text style={styles.insightText}>Keep up the healthy habits!</Text>
          </View>
        </View>

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
          onPress={() => router.back()}
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
        {observations.map((obs, index) => {
          const isLast = index === observations.length - 1;
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
                <Text style={styles.biomarkerValue}>
                  {obs.value_num} {obs.unit}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Dual Action Buttons: [ Edit ] and [ Confirm ] */}
      <View style={styles.dualActionRow}>
        <Animated.View style={[{ flex: 1 }, { transform: [{ scale: btnScale1 }] }]}>
          <Pressable
            accessibilityRole="button"
            onPressIn={() => onPressIn(btnScale1)}
            onPressOut={() => onPressOut(btnScale1)}
            onPress={() => router.push('/(app)/reports/manual')}
            style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
    paddingHorizontal: 32,
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
    borderColor: '#7545ED',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7545ED',
  },
  confirmBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#7545ED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7545ED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centerHeroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  sparklesWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  aiLoadingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#171717',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  aiLoadingSubtitle: {
    fontSize: 15,
    color: '#60646C',
    textAlign: 'center',
  },
  mistContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 120,
    position: 'relative',
  },
  floatingStarWrap: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    zIndex: 2,
  },
  mistStarText: {
    fontSize: 22,
    color: '#C4B5FD',
  },
  wavyMistShape: {
    width: '120%',
    height: 70,
    backgroundColor: '#F3EEFD',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    opacity: 0.85,
    position: 'relative',
    overflow: 'hidden',
  },
  mistCurve1: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 200,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EBE2FD',
  },
  mistCurve2: {
    position: 'absolute',
    bottom: -15,
    right: -20,
    width: 220,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E6DCFC',
  },
  celebrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 20,
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
    backgroundColor: '#7545ED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7545ED',
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
