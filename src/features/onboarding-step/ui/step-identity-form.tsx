import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@shared/ui/chip';

import { Calendar, type DateData } from 'react-native-calendars';

import type { BasicsInput } from '../model/onboarding.types';

type Sex = BasicsInput['sex'];

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// The oldest date of birth the form accepts (120 years back), and the newest (today).
const MIN_DATE = new Date(new Date().getFullYear() - 120, 0, 1);
const MAX_DATE = new Date();

function toKey(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function formatDate(date: Date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

interface Draft {
  dob: Date | null;
  sex: Sex | null;
  height: string;
  weight: string;
}

// Step 1 asks for date of birth, sex, height and weight. The backend stores birth_year, taken from the date.
export function StepIdentityForm({ onChange }: { onChange: (value: BasicsInput | null) => void }) {
  const [draft, setDraft] = useState<Draft>({ dob: null, sex: null, height: '', weight: '' });
  const [showPicker, setShowPicker] = useState(false);

  function update(patch: Partial<Draft>) {
    const next = { ...draft, ...patch };
    setDraft(next);

    const cm = Number(next.height);
    const kg = Number(next.weight);
    const valid =
      next.dob !== null &&
      next.sex !== null &&
      cm >= 50 &&
      cm <= 260 &&
      kg >= 20 &&
      kg <= 400;

    onChange(
      valid && next.dob && next.sex
        ? { birth_year: next.dob.getFullYear(), sex: next.sex, height_cm: cm, weight_kg: kg }
        : null,
    );
  }

  function onDateSelect(day: DateData) {
    setShowPicker(false);
    const [y, m, d] = day.dateString.split('-').map(Number);
    update({ dob: new Date(y, m - 1, d) });
  }

  const selectedKey = draft.dob ? toKey(draft.dob) : undefined;
  const marked = selectedKey ? { [selectedKey]: { selected: true, selectedColor: '#7545ED' } } : {};

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Date of birth</Text>
      <View style={styles.dobWrap}>
        <Pressable accessibilityRole="button" onPress={() => setShowPicker((v) => !v)} style={styles.input}>
          <Ionicons name="calendar-outline" size={20} color="#7545ED" style={styles.inputIcon} />
          <Text style={draft.dob ? styles.inputText : styles.placeholder}>
            {draft.dob ? formatDate(draft.dob) : 'Select your date of birth'}
          </Text>
        </Pressable>
        {showPicker ? (
          <View style={styles.popover}>
            <Calendar
            current={toKey(draft.dob ?? new Date(2000, 0, 1))}
            minDate={toKey(MIN_DATE)}
            maxDate={toKey(MAX_DATE)}
            onDayPress={onDateSelect}
            markedDates={marked}
            enableSwipeMonths
            theme={{ todayTextColor: '#7545ED', arrowColor: '#7545ED', textDayFontWeight: '500', textMonthFontWeight: '700' }}
          />
          </View>
        ) : null}
      </View>

      <Text style={styles.label}>Sex</Text>
      <View style={styles.chips}>
        {SEX_OPTIONS.map((opt) => (
          <Chip key={opt.value} label={opt.label} selected={draft.sex === opt.value} onPress={() => update({ sex: opt.value })} />
        ))}
      </View>

      <Text style={styles.label}>Height (cm)</Text>
      <TextInput
        style={styles.textInput}
        keyboardType="decimal-pad"
        value={draft.height}
        onChangeText={(v) => update({ height: v })}
        placeholder="e.g. 172"
      />

      <Text style={styles.label}>Weight (kg)</Text>
      <TextInput
        style={styles.textInput}
        keyboardType="decimal-pad"
        value={draft.weight}
        onChangeText={(v) => update({ weight: v })}
        placeholder="e.g. 68"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#171717', marginTop: 6 },
  dobWrap: { position: 'relative', zIndex: 20 },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E0E1E6',
    borderRadius: 12, padding: 14, backgroundColor: '#FFFFFF',
  },
  inputIcon: { marginRight: 2 },
  popover: {
    position: 'absolute', top: 56, left: 0, right: 0, zIndex: 30, elevation: 8,
    shadowColor: '#171717', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  inputText: { fontSize: 16, color: '#171717' },
  placeholder: { fontSize: 16, color: '#9CA3AF' },
  textInput: { borderWidth: 1, borderColor: '#E0E1E6', borderRadius: 12, padding: 12, fontSize: 16, color: '#171717', backgroundColor: '#FFFFFF' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
