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
const EXERCISE: Choice<LifestyleInput['exercise']>[] = [
  { value: 'none', label: 'None' },
  { value: '1_2_week', label: '1-2 a week' },
  { value: '3_4_week', label: '3-4 a week' },
  { value: '5_plus_week', label: '5+ a week' },
];

function ChoiceRow<T>({ choices, value, onPick }: { choices: Choice<T>[]; value: unknown; onPick: (v: T) => void }) {
  return (
    <View style={styles.chips}>
      {choices.map((c) => (
        <Chip key={String(c.value)} label={c.label} selected={value === c.value} onPress={() => onPick(c.value)} />
      ))}
    </View>
  );
}

// Sleep and stress are chip scales rather than sliders, so every value is reachable with one tap.
export function StepLifestyleForm({ onChange }: { onChange: (value: LifestyleInput | null) => void }) {
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
      <ChoiceRow choices={SLEEP} value={draft.sleep} onPick={(v) => set('sleep', v)} />
      <Text style={styles.label}>Stress (1 = low, 5 = high)</Text>
      <ChoiceRow choices={STRESS} value={draft.stress} onPick={(v) => set('stress', v)} />
      <Text style={styles.label}>Diet</Text>
      <ChoiceRow choices={DIET} value={draft.diet} onPick={(v) => set('diet', v)} />
      <Text style={styles.label}>Smoking</Text>
      <ChoiceRow choices={SMOKING} value={draft.smoking} onPick={(v) => set('smoking', v)} />
      <Text style={styles.label}>Alcohol</Text>
      <ChoiceRow choices={ALCOHOL} value={draft.alcohol} onPick={(v) => set('alcohol', v)} />
      <Text style={styles.label}>Exercise</Text>
      <ChoiceRow choices={EXERCISE} value={draft.exercise} onPick={(v) => set('exercise', v)} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#171717', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
