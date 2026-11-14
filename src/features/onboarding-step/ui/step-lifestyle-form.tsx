import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@shared/ui/chip';

import { useLifestyleDraft } from '../model/use-onboarding-drafts';
import type { LifestyleInput } from '../model/onboarding.types';

type Choice<T> = { value: T; label: string };

const SLEEP: Choice<number>[] = [5, 6, 7, 8, 9].map((h) => ({ value: h, label: `${h} h` }));
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

function ChoiceRow<T>({
  choices,
  value,
  onPick,
  name,
  missing,
  onFieldLayout,
}: {
  choices: Choice<T>[];
  value: unknown;
  onPick: (v: T) => void;
  name: string;
  missing: boolean;
  onFieldLayout?: (name: string, y: number) => void;
}) {
  return (
    <View
      style={[styles.chips, missing && styles.chipsError]}
      onLayout={(e) => onFieldLayout?.(name, e.nativeEvent.layout.y)}>
      {choices.map((c) => (
        <Chip key={String(c.value)} label={c.label} selected={value === c.value} onPress={() => onPick(c.value)} />
      ))}
    </View>
  );
}

// Sleep and stress are chip scales rather than sliders, so every value is reachable with one tap.
export function StepLifestyleForm({
  onChange,
  missing = [],
  onFieldLayout,
}: {
  onChange: (value: LifestyleInput | null) => void;
  missing?: string[];
  onFieldLayout?: (name: string, y: number) => void;
}) {
  const [draft, patchDraft] = useLifestyleDraft();

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    patchDraft({ [key]: value } as Partial<typeof draft>);
  }

  // Report the step as complete only when every choice has been made.
  useEffect(() => {
    const complete = Object.values(draft).every((v) => v !== null);
    onChange(complete ? (draft as LifestyleInput) : null);
  }, [draft, onChange]);

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Average sleep</Text>
      <ChoiceRow choices={SLEEP} value={draft.sleep} onPick={(v) => set('sleep', v)} name="sleep" missing={missing.includes('sleep')} onFieldLayout={onFieldLayout} />
      <Text style={styles.label}>Stress (1 = low, 5 = high)</Text>
      <ChoiceRow choices={STRESS} value={draft.stress} onPick={(v) => set('stress', v)} name="stress" missing={missing.includes('stress')} onFieldLayout={onFieldLayout} />
      <Text style={styles.label}>Diet</Text>
      <ChoiceRow choices={DIET} value={draft.diet} onPick={(v) => set('diet', v)} name="diet" missing={missing.includes('diet')} onFieldLayout={onFieldLayout} />
      <Text style={styles.label}>Smoking</Text>
      <ChoiceRow choices={SMOKING} value={draft.smoking} onPick={(v) => set('smoking', v)} name="smoking" missing={missing.includes('smoking')} onFieldLayout={onFieldLayout} />
      <Text style={styles.label}>Alcohol</Text>
      <ChoiceRow choices={ALCOHOL} value={draft.alcohol} onPick={(v) => set('alcohol', v)} name="alcohol" missing={missing.includes('alcohol')} onFieldLayout={onFieldLayout} />
      <Text style={styles.label}>Exercise</Text>
      <ChoiceRow choices={EXERCISE} value={draft.exercise} onPick={(v) => set('exercise', v)} name="exercise" missing={missing.includes('exercise')} onFieldLayout={onFieldLayout} />
      <Text style={styles.label}>Occupation</Text>
      <ChoiceRow choices={OCCUPATION} value={draft.occupation} onPick={(v) => set('occupation', v)} name="occupation" missing={missing.includes('occupation')} onFieldLayout={onFieldLayout} />
      <Text style={styles.label}>How active is your work?</Text>
      <ChoiceRow choices={ACTIVITY} value={draft.activity_level} onPick={(v) => set('activity_level', v)} name="activity_level" missing={missing.includes('activity_level')} onFieldLayout={onFieldLayout} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#171717', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipsError: { borderWidth: 1.5, borderColor: '#C22F43', borderRadius: 14, padding: 8 },
});
