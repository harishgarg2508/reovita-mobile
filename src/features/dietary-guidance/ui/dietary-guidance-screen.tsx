import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isApiError, queryKeys } from '@shared/api';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { useActiveConsent, useGrantConsentType } from '@entities/consent';
import { DietaryChartBody, startDietaryChart, useDietaryChart, useDietaryOverview, type DietaryGoal, type DietType } from '@entities/dietary-chart';
import { useJobStatus } from '@entities/job';
import { useScrollToTopOnFocus } from '@shared/lib';

const FAILURES: Record<string, string> = {
  llm_unavailable: 'The guidance service is busy right now. Try again in a moment.',
  llm_failed: 'I could not make the chart this time. Try again in a moment.',
  rate_limited: 'You have made a few charts today. Try again tomorrow.',
  goal_not_suitable: 'That goal does not suit your numbers. Choose another.',
};

// Dietary guidance: where the person's BMI sits, the healthy weight range for their height, and a one-day meal plan for the goal and diet type they choose.
// The numbers are worked out in the app's server from the saved height and weight; the plan is written by the AI service (it needs llm_processing consent)
// and takes a few seconds, so it runs as a job. The disclaimer is shown with every chart.
export function DietaryGuidanceScreen() {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const overview = useDietaryOverview();
  const latest = useDietaryChart();
  const llm = useActiveConsent('llm_processing');
  const grant = useGrantConsentType();
  const [goal, setGoal] = useState<DietaryGoal | null>(null);
  const [diet, setDiet] = useState<DietType>('vegetarian');
  const [jobId, setJobId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const job = useJobStatus(jobId);

  const chosenGoal = goal ?? overview.data?.suggested_goal ?? 'stay_healthy';
  const working = starting || (!!jobId && job.data?.status !== 'done' && job.data?.status !== 'failed' && !job.isError);

  // A finished job: read the chart again.
  const doneJob = job.data?.status === 'done' ? jobId : undefined;
  useEffect(() => {
    if (doneJob) void queryClient.invalidateQueries({ queryKey: queryKeys.dietary.chart() });
  }, [doneJob, queryClient]);
  const jobFailure = job.data?.status === 'failed' ? (FAILURES[job.data.error_code ?? ''] ?? 'Something went wrong. Try again in a moment.') : null;

  async function make() {
    setError(null);
    setStarting(true);
    try {
      if (!llm.granted) await grant.mutateAsync('llm_processing');
      const { job_id } = await startDietaryChart(chosenGoal, diet);
      setJobId(job_id);
    } catch (err) {
      setError(isApiError(err) ? (FAILURES[err.code] ?? err.message) : 'Something went wrong. Try again in a moment.');
    } finally {
      setStarting(false);
    }
  }

  const back = () => goBackOr(router, '/(app)/(tabs)/dashboard' as Href);
  const basicsMissing = overview.isError && isApiError(overview.error, 'basics_missing');
  const underage = overview.isError && isApiError(overview.error, 'age_not_supported');

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={back} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Dietary guidance</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="My earlier charts" hitSlop={8} onPress={() => router.push('/(app)/dietary-history' as Href)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="time-outline" size={19} color={p.text} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {overview.isPending ? <ActivityIndicator color={p.accent} style={{ marginTop: 32 }} /> : null}
        {basicsMissing ? (
          <View style={[styles.card, styles.stateCard, { backgroundColor: p.card, borderColor: p.border }]}>
            <Ionicons name="body-outline" size={30} color={p.accent} />
            <Text style={[styles.cardTitle, { color: p.text }]}>Add your height and weight</Text>
            <Text style={[styles.cardText, { color: p.muted, textAlign: 'center' }]}>Your guidance starts from your BMI, so it needs your height and weight.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/onboarding/step-1', params: { edit: 'true' } })} style={[styles.primary, styles.stateButton, { backgroundColor: p.accent }]}>
              <Text style={styles.primaryText}>Add my details</Text>
            </Pressable>
          </View>
        ) : null}
        {underage ? (
          <View style={[styles.card, styles.stateCard, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text style={[styles.cardTitle, { color: p.text }]}>For adults only</Text>
            <Text style={[styles.cardText, { color: p.muted, textAlign: 'center' }]}>Dietary guidance is for people aged 18 and over.</Text>
          </View>
        ) : null}
        {overview.isError && !basicsMissing && !underage ? (
          <View style={[styles.card, styles.stateCard, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text style={[styles.cardTitle, { color: p.text }]}>Could not load your guidance</Text>
            <Text style={[styles.cardText, { color: p.muted, textAlign: 'center' }]}>Check your connection and try again.</Text>
            <Pressable accessibilityRole="button" onPress={() => void overview.refetch()} style={[styles.primary, styles.stateButton, { backgroundColor: p.accent }]}>
              <Text style={styles.primaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {overview.data ? (
          <>
            <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={styles.bmiRow}>
                <Text style={[styles.bmi, { color: p.text }]}>{overview.data.bmi}</Text>
                <View style={styles.bmiText}>
                  <Text style={[styles.cardTitle, { color: p.text }]}>BMI · {overview.data.label}</Text>
                  <Text style={[styles.cardText, { color: p.muted }]}>
                    A healthy weight for your height is about {overview.data.healthy_weight_kg.min}–{overview.data.healthy_weight_kg.max} kg.
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.section, { color: p.text }]}>Your goal</Text>
            {overview.data.goals.map((option) => {
              const on = chosenGoal === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on, disabled: !option.available }}
                  disabled={!option.available || working}
                  onPress={() => setGoal(option.value)}
                  style={[styles.option, { backgroundColor: p.card, borderColor: on ? p.accent : p.border }, !option.available && { opacity: 0.5 }]}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? p.accent : p.muted} />
                  <View style={styles.optionText}>
                    <Text style={[styles.cardTitle, { color: p.text }]}>
                      {option.label}
                      {option.suggested ? '  · suggested' : ''}
                    </Text>
                    {option.reason ? <Text style={[styles.cardText, { color: p.muted }]}>{option.reason}</Text> : null}
                  </View>
                </Pressable>
              );
            })}

            <Text style={[styles.section, { color: p.text }]}>How you eat</Text>
            <View style={styles.chips}>
              {overview.data.diet_types.map((type) => {
                const on = diet === type.value;
                return (
                  <Pressable key={type.value} accessibilityRole="radio" accessibilityState={{ selected: on }} disabled={working} onPress={() => setDiet(type.value)} style={[styles.chip, { borderColor: on ? p.accent : p.border, backgroundColor: on ? p.accentSoft : p.card }]}>
                    <Text style={[styles.chipText, { color: on ? p.accent : p.muted }]}>{type.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {!llm.granted && !llm.isPending ? <Text style={[styles.cardText, { color: p.muted }]}>To write your plan, your age, height, weight and goal are sent to our AI service. Tapping the button below agrees to that.</Text> : null}
            {error ?? jobFailure ? <Text style={[styles.error, { color: p.red }]}>{error ?? jobFailure}</Text> : null}
            <Pressable accessibilityRole="button" disabled={working} onPress={() => void make()} style={[styles.primary, { backgroundColor: p.accent }, working && { opacity: 0.7 }]}>
              {working ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{latest.data ? 'Make a new chart' : 'Make my chart'}</Text>}
            </Pressable>
            {working ? <Text style={[styles.cardText, { color: p.muted, textAlign: 'center' }]}>Writing your chart, this takes a few seconds...</Text> : null}
          </>
        ) : null}

        {latest.data ? (
          <View style={styles.chart}>
            <Text style={[styles.section, { color: p.text }]}>Your chart</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>Made on {new Date(latest.data.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <DietaryChartBody chart={latest.data.chart} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontWeight: '800' },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  note: { fontSize: 14, textAlign: 'center', marginTop: 32, paddingHorizontal: 24, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16 },
  stateCard: { alignItems: 'center', gap: 10, marginTop: 24 },
  stateButton: { alignSelf: 'stretch', marginTop: 4 },
  bmiRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bmi: { fontSize: 38, fontWeight: '800' },
  bmiText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardText: { fontSize: 13.5, lineHeight: 19 },
  section: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 16, padding: 14 },
  optionText: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1.5, justifyContent: 'center' },
  chipText: { fontSize: 13.5, fontWeight: '700' },
  error: { fontSize: 13, lineHeight: 18 },
  primary: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  chart: { gap: 8, marginTop: 8 },
});
