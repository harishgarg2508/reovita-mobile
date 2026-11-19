import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@shared/ui/chip';
import { NumberWheel } from '@shared/ui/number-wheel';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

import { useLifestyleDraft } from '../model/use-onboarding-drafts';
import { PrivateHealthCard } from './private-health-card';
import type { LifestyleInput } from '../model/onboarding.types';

type Choice<T> = { value: T; label: string };

// Sleep is picked on a dial from 1 to 24 hours. It shows 7 until the user moves it.
const SLEEP_MIN = 1;
const SLEEP_MAX = 24;
const DEFAULT_SLEEP = 7;
const STRESS: Choice<number>[] = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));
const DIET: Choice<LifestyleInput['diet']>[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'keto', label: 'Keto' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'other', label: 'Other' },
];
const SMOKING: Choice<LifestyleInput['smoking']>[] = [
  { value: 'never', label: 'Never' },
  { value: 'former', label: 'Former' },
  { value: 'current', label: 'Current' },
];
const ALCOHOL: Choice<LifestyleInput['alcohol']>[] = [
  { value: 'never', label: 'Never' },
  { value: 'occasional', label: 'Occasional' },
  { value: 'regular', label: 'Regular' },
];
const OCCUPATION: Choice<LifestyleInput['occupation']>[] = [
  { value: 'desk', label: 'Desk / office' },
  { value: 'mostly_standing', label: 'Mostly standing or walking' },
  { value: 'manual_field', label: 'Manual or field work' },
  { value: 'heavy_labour', label: 'Heavy labour' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'student_homemaker', label: 'Student / homemaker' },
  { value: 'retired', label: 'Retired / not working' },
  { value: 'other', label: 'Other' },
];
const ACTIVITY: Choice<LifestyleInput['activity_level']>[] = [
  { value: 'sedentary', label: 'Mostly sitting' },
  { value: 'light', label: 'Light movement' },
  { value: 'moderate', label: 'Moderately active' },
  { value: 'heavy', label: 'Very physical' },
];
const EXERCISE: Choice<LifestyleInput['exercise']>[] = [
  { value: 'none', label: 'None' },
  { value: '1_2_week', label: '1-2 a week' },
  { value: '3_4_week', label: '3-4 a week' },
  { value: '5_plus_week', label: '5+ a week' },
];

type IconName = keyof typeof Ionicons.glyphMap;

// A group of related questions in a soft card, with an icon and a short line saying what it covers.
function Section({ icon, title, subtitle, onLayout, children }: { icon: IconName; title: string; subtitle: string; onLayout: (y: number) => void; children: ReactNode }) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.section} onLayout={(e) => onLayout(e.nativeEvent.layout.y)}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={20} color={colors.accent} />
        </View>
        <View style={styles.sectionText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

// One question inside a section. A question left unanswered is outlined after the first Next press.
function Field({ label, hint, name, missing, onLayout, children, isPrivate = false }: { label: string; hint?: string; isPrivate?: boolean; name: string; missing: boolean; onLayout: (name: string, y: number) => void; children: ReactNode }) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.field, missing && styles.fieldError]} onLayout={(e) => onLayout(name, e.nativeEvent.layout.y)}>
      <View style={styles.fieldHead}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {/* Only a lock: the answer is private, and the icon says so without extra words. */}
          {isPrivate ? (
            <View style={styles.privateTag} accessible accessibilityLabel="Private. Only you can see this.">
              <Ionicons name="lock-closed" size={12} color={colors.accent} />
            </View>
          ) : null}
        </View>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ChoiceRow<T>({ choices, value, onPick }: { choices: Choice<T>[]; value: unknown; onPick: (v: T) => void }) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.chips}>
      {choices.map((c) => (
        <Chip key={String(c.value)} label={c.label} selected={value === c.value} onPress={() => onPick(c.value)} />
      ))}
    </View>
  );
}

// Stress from 1 to 5 as five connected steps, low on the left and high on the right.
function StressScale({ value, onPick }: { value: number | null; onPick: (v: number) => void }) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.scaleWrap}>
      <View style={styles.scale} accessibilityRole="radiogroup">
        {STRESS.map((choice) => {
          const on = value === choice.value;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Stress ${choice.label} of 5`}
              onPress={() => onPick(choice.value)}
              style={[styles.step, on && styles.stepOn]}>
              <Text style={[styles.stepText, on && styles.stepTextOn]}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.scaleEnds}>
        <Text style={styles.hint}>Low</Text>
        <Text style={styles.hint}>High</Text>
      </View>
    </View>
  );
}

// The questions are grouped into cards: rest, habits, activity and work. Sleep and stress are chips and steps rather than sliders,
// so every value is reachable with one tap.
export function StepLifestyleForm({
  onChange,
  missing = [],
  onFieldLayout,
}: {
  onChange: (value: LifestyleInput | null) => void;
  missing?: string[];
  onFieldLayout?: (name: string, y: number) => void;
}) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [draft, patchDraft] = useLifestyleDraft();
  // A field's position is reported from inside its card, so the card's own position is added to it.
  const sectionY = useRef(0);

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    patchDraft({ [key]: value } as Partial<typeof draft>);
  }

  // Report the step as complete only when every choice has been made.
  useEffect(() => {
    // An untouched sleep dial counts as its default hour.
    const effective = { ...draft, sleep: draft.sleep ?? DEFAULT_SLEEP };
    const complete = Object.values(effective).every((v) => v !== null);
    onChange(complete ? (effective as LifestyleInput) : null);
  }, [draft, onChange]);

  const report = (name: string, y: number) => onFieldLayout?.(name, sectionY.current + y);
  const mark = (y: number) => {
    sectionY.current = y;
  };

  return (
    <View style={styles.form}>
      <Section icon="moon-outline" title="Rest" subtitle="How you sleep and how stressed you feel" onLayout={mark}>
        <Field label="Average sleep" name="sleep" missing={missing.includes('sleep')} onLayout={report}>
          <NumberWheel value={draft.sleep ?? DEFAULT_SLEEP} minValue={SLEEP_MIN} maxValue={SLEEP_MAX} suffix=" h" onChange={(hours) => set('sleep', hours)} />
        </Field>
        <Field label="Stress" hint="1 is low, 5 is high" name="stress" missing={missing.includes('stress')} onLayout={report}>
          <StressScale value={draft.stress} onPick={(v) => set('stress', v)} />
        </Field>
      </Section>

      <Section icon="leaf-outline" title="Habits" subtitle="What you eat, smoke and drink" onLayout={mark}>
        <Field label="Diet" name="diet" missing={missing.includes('diet')} onLayout={report}>
          <ChoiceRow choices={DIET} value={draft.diet} onPick={(v) => set('diet', v)} />
        </Field>
        <Field label="Smoking" isPrivate name="smoking" missing={missing.includes('smoking')} onLayout={report}>
          <ChoiceRow choices={SMOKING} value={draft.smoking} onPick={(v) => set('smoking', v)} />
        </Field>
        <Field label="Alcohol" isPrivate name="alcohol" missing={missing.includes('alcohol')} onLayout={report}>
          <ChoiceRow choices={ALCOHOL} value={draft.alcohol} onPick={(v) => set('alcohol', v)} />
        </Field>
      </Section>

      <Section icon="walk-outline" title="Movement" subtitle="How much you move in a week" onLayout={mark}>
        <Field label="Exercise" name="exercise" missing={missing.includes('exercise')} onLayout={report}>
          <ChoiceRow choices={EXERCISE} value={draft.exercise} onPick={(v) => set('exercise', v)} />
        </Field>
      </Section>

      <Section icon="briefcase-outline" title="Work" subtitle="What you do and how active it keeps you" onLayout={mark}>
        <Field label="Occupation" name="occupation" missing={missing.includes('occupation')} onLayout={report}>
          <ChoiceRow choices={OCCUPATION} value={draft.occupation} onPick={(v) => set('occupation', v)} />
        </Field>
        <Field label="How active is your work?" name="activity_level" missing={missing.includes('activity_level')} onLayout={report}>
          <ChoiceRow choices={ACTIVITY} value={draft.activity_level} onPick={(v) => set('activity_level', v)} />
        </Field>
      </Section>

      {/* Optional and private: it is not part of the step, so skipping it never blocks Next. */}
      <PrivateHealthCard />
    </View>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
    form: { gap: 14 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    privateTag: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
    section: { gap: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.card, padding: 16 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sectionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    sectionText: { flex: 1, gap: 1 },
    sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15.5, color: colors.textStrong },
    sectionSub: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: colors.muted },
    field: { gap: 10 },
    fieldError: { borderWidth: 1.5, borderColor: colors.error, borderRadius: 14, padding: 8 },
    fieldHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
    label: { fontFamily: 'Poppins_500Medium', fontSize: 13.5, color: colors.text },
    hint: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, color: colors.muted },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    scaleWrap: { gap: 6 },
    scale: { flexDirection: 'row', gap: 6 },
    step: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    stepOn: { backgroundColor: colors.accentFill, borderColor: colors.accentFill },
    stepText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: colors.muted },
    stepTextOn: { color: colors.onAccent },
    scaleEnds: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  });
