import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useBasicsDraft } from '../model/use-onboarding-drafts';
import type { BasicsInput } from '../model/onboarding.types';

import { YearWheel } from './year-wheel';

type Sex = BasicsInput['sex'];

const SEX_SEGMENTS: { value: Sex; short: string; label: string }[] = [
  { value: 'female', short: 'F', label: 'Female' },
  { value: 'male', short: 'M', label: 'Male' },
  { value: 'other', short: 'Other', label: 'Other' },
  { value: 'prefer_not_to_say', short: 'Prefer not to say', label: 'Prefer not to say' },
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1900;
const MAX_YEAR = CURRENT_YEAR;

// BMI category for the automatic card. Bands follow the WHO adult ranges.
function bmiCategory(bmi: number): 'Under' | 'Healthy' | 'Over' | 'Obese' {
  if (bmi < 18.5) return 'Under';
  if (bmi < 25) return 'Healthy';
  if (bmi < 30) return 'Over';
  return 'Obese';
}

const CATEGORY_ORDER: ('Under' | 'Healthy' | 'Over' | 'Obese')[] = ['Under', 'Healthy', 'Over', 'Obese'];

// Step 1: birth year, sex, height and weight. BMI is worked out from height and weight.
export function StepIdentityForm({
  onChange,
  showErrors = false,
}: {
  onChange: (value: BasicsInput | null) => void;
  showErrors?: boolean;
}) {
  const [draft, patchDraft] = useBasicsDraft();

  function update(patch: Partial<typeof draft>) {
    const next = { ...draft, ...patch };
    patchDraft(patch);

    const cm = Number(next.height);
    const kg = Number(next.weight);
    const valid =
      next.year >= MIN_YEAR &&
      next.year <= MAX_YEAR &&
      next.sex !== null &&
      cm >= 50 &&
      cm <= 260 &&
      kg >= 20 &&
      kg <= 400;

    onChange(valid && next.sex ? { birth_year: next.year, sex: next.sex, height_cm: cm, weight_kg: kg } : null);
  }

  const cm = Number(draft.height);
  const kg = Number(draft.weight);
  const bmi = cm >= 50 && kg >= 20 ? kg / ((cm / 100) * (cm / 100)) : null;
  const category = bmi !== null ? bmiCategory(bmi) : null;
  // Required fields that are still empty or out of range are highlighted, only after Continue was pressed.
  const sexMissing = showErrors && draft.sex === null;
  const heightMissing = showErrors && !(cm >= 50 && cm <= 260);
  const weightMissing = showErrors && !(kg >= 20 && kg <= 400);

  return (
    <View style={styles.form}>
      {/* Birth year: scroll wheel from the current year back to 1900 */}
      <View style={styles.block}>
        <View style={styles.labelRow}>
          <View style={styles.labelBadge}>
            <Ionicons name="calendar-outline" size={13} color="#1F6F3F" />
          </View>
          <Text style={styles.label}>Birth year *</Text>
        </View>
        <YearWheel value={draft.year} minYear={MIN_YEAR} maxYear={MAX_YEAR} onChange={(year) => update({ year })} />
      </View>

      {/* Sex segments */}
      <View style={styles.block}>
        <View style={styles.labelRow}>
          <View style={styles.labelBadge}>
            <Ionicons name="male-female-outline" size={13} color="#1F6F3F" />
          </View>
          <Text style={styles.label}>Sex *</Text>
        </View>
        <View style={[styles.segments, sexMissing && styles.fieldError]}>
          {SEX_SEGMENTS.map((seg) => {
            const selected = draft.sex === seg.value;
            return (
              <Pressable
                key={seg.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => update({ sex: seg.value })}
                style={[styles.segment, seg.value === 'prefer_not_to_say' && styles.segmentWide, selected && styles.segmentOn]}>
                <Text numberOfLines={1} style={[styles.segmentText, selected && styles.segmentTextOn]}>{seg.short}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Height and weight */}
      <View style={styles.row}>
        <View style={styles.half}>
          <View style={styles.labelRow}>
            <View style={styles.labelBadge}>
              <Ionicons name="resize-outline" size={13} color="#1F6F3F" />
            </View>
            <Text style={styles.label}>Height *</Text>
          </View>
          <View style={[styles.numeric, heightMissing && styles.fieldError]}>
            <TextInput
              style={styles.numericValue}
              keyboardType="decimal-pad"
              value={draft.height}
              onChangeText={(v) => update({ height: v })}
              placeholder="170"
              placeholderTextColor="#9185AA"
            />
            <Text style={styles.unit}>cm</Text>
          </View>
        </View>
        <View style={styles.half}>
          <View style={styles.labelRow}>
            <View style={styles.labelBadge}>
              <Ionicons name="speedometer-outline" size={13} color="#1F6F3F" />
            </View>
            <Text style={styles.label}>Weight *</Text>
          </View>
          <View style={[styles.numeric, weightMissing && styles.fieldError]}>
            <TextInput
              style={styles.numericValue}
              keyboardType="decimal-pad"
              value={draft.weight}
              onChangeText={(v) => update({ weight: v })}
              placeholder="65"
              placeholderTextColor="#9185AA"
            />
            <Text style={styles.unit}>kg</Text>
          </View>
        </View>
      </View>

      {/* Automatic BMI */}
      <View style={styles.bmiCard}>
        <View style={styles.bmiTop}>
          <View>
            <Text style={styles.bmiLabel}>BMI · Automatic</Text>
            <Text style={styles.bmiValue}>{bmi !== null ? bmi.toFixed(1) : '--'}</Text>
          </View>
          {category ? (
            <View style={styles.chip}>
              <Ionicons name="checkmark" size={14} color="#3D5500" />
              <Text style={styles.chipText}>{category === 'Healthy' ? 'Healthy' : category}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.bmiBands}>
          {CATEGORY_ORDER.map((c) => {
            const active = category === c;
            return (
              <View key={c} style={styles.band}>
                <View style={[styles.bandBar, active && styles.bandBarOn]} />
                <Text style={[styles.bandText, active && styles.bandTextOn]}>{c === 'Under' ? 'Under' : c === 'Over' ? 'Over' : c}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldError: { borderColor: '#C22F43', borderWidth: 1.5 },
  form: { gap: 24 },
  block: { gap: 8 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#F1EDF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#242032' },

  segments: {
    flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, padding: 4, borderRadius: 999, backgroundColor: '#F1EDF7',
  },
  segment: { flex: 1, minWidth: 0, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segmentWide: { flex: 2.4 },
  segmentOn: { backgroundColor: '#1F6F3F' },
  segmentText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#655F74' },
  segmentTextOn: { fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },

  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, gap: 8 },
  numeric: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 64,
    padding: 16, borderWidth: 1, borderColor: '#E5E0EC', borderRadius: 14, backgroundColor: '#FFFFFF',
  },
  numericValue: { flex: 1, minWidth: 0, width: 0, fontFamily: 'Poppins_400Regular', fontSize: 24, color: '#242032', padding: 0 },
  unit: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#6B7280', flexShrink: 0, marginLeft: 8 },

  bmiCard: { backgroundColor: '#F1EDF7', borderRadius: 16, padding: 16, gap: 12 },
  bmiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bmiLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#655F74' },
  bmiValue: { fontFamily: 'Poppins_500Medium', fontSize: 26, color: '#242032' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, backgroundColor: '#D4FF3F',
  },
  chipText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#3D5500' },
  bmiBands: { flexDirection: 'row', gap: 4 },
  band: { flex: 1, alignItems: 'center', gap: 4 },
  bandBar: { height: 4, alignSelf: 'stretch', borderRadius: 999, backgroundColor: '#E5E0EC' },
  bandBarOn: { backgroundColor: '#1F6F3F' },
  bandText: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: '#6B7280' },
  bandTextOn: { color: '#1F6F3F' },
});
