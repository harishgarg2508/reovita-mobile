import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { newId, tapSelection } from '@shared/lib';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';
import { useResolvedScheme } from '@shared/ui/theme';

import type { MedicationDraft } from '@entities/onboarding';
import { AddMedicationCard, DOSE_MAX, type NewMedication } from './add-medication-card';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// The medicine list of step 2. A matched medicine shows "checked": it takes part in the interaction check.
// One without ingredients shows "not matched — won't be checked": it is kept, and left out of the check.
// The list lives in memory only; removing a row here removes it from the next save.
export function MedicationsSection({ medications, onChange }: { medications: MedicationDraft[]; onChange: (next: MedicationDraft[]) => void }) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [adding, setAdding] = useState(false);
  // "I don't take any medicines": the list is empty on purpose, so the section says so instead of looking unfilled.
  const [none, setNone] = useState(false);

  const add = (med: NewMedication) => {
    onChange([...medications, { id: newId(), name: med.name, dose: med.dose, schedule_times: [], ingredient_ids: med.ingredient_ids }]);
    setAdding(false);
    setNone(false);
  };
  const remove = (id: string) => {
    tapSelection();
    onChange(medications.filter((m) => m.id !== id));
  };
  const patch = (id: string, change: Partial<MedicationDraft>) => onChange(medications.map((m) => (m.id === id ? { ...m, ...change } : m)));

  const addTime = (med: MedicationDraft, time: string) => {
    const value = time.trim();
    if (!TIME.test(value) || med.schedule_times.includes(value) || med.schedule_times.length >= 6) return;
    tapSelection();
    patch(med.id, { schedule_times: [...med.schedule_times, value].sort() });
  };

  return (
    <View style={styles.box}>
      {medications.map((med) => {
        const checked = med.ingredient_ids.length > 0;
        return (
          <View key={med.id} style={styles.row}>
            <View style={styles.head}>
              <Text style={styles.name} numberOfLines={2}>
                {med.name}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${med.name}`} onPress={() => remove(med.id)} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.accent} />
              </Pressable>
            </View>

            <View style={[styles.pill, checked ? styles.pillChecked : styles.pillUnmatched]}>
              <Ionicons name={checked ? 'checkmark-circle' : 'alert-circle-outline'} size={13} color={checked ? colors.accent : colors.warnText} />
              <Text style={[styles.pillText, checked ? styles.pillTextChecked : styles.pillTextUnmatched]}>
                {checked ? 'checked' : 'not matched — won’t be checked'}
              </Text>
            </View>

            <TextInput
              value={med.dose}
              onChangeText={(text) => patch(med.id, { dose: text.slice(0, DOSE_MAX) })}
              placeholder="Dose, e.g. 500 mg (optional)"
              placeholderTextColor={colors.placeholder}
              maxLength={DOSE_MAX}
              style={styles.dose}
            />

            <Text style={styles.timesLabel}>Reminder times (optional)</Text>
            <View style={styles.times}>
              {med.schedule_times.map((time) => (
                <Pressable
                  key={time}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove reminder ${time}`}
                  onPress={() => patch(med.id, { schedule_times: med.schedule_times.filter((t) => t !== time) })}
                  style={styles.timeTag}>
                  <Text style={styles.timeTagText}>{time}</Text>
                  <Ionicons name="close" size={12} color={colors.accent} />
                </Pressable>
              ))}
              {med.schedule_times.length < 6 ? <TimeAdder onAdd={(time) => addTime(med, time)} /> : null}
            </View>
          </View>
        );
      })}

      {adding ? (
        <AddMedicationCard existingNames={medications.map((m) => m.name)} onAdd={add} onCancel={() => setAdding(false)} />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            tapSelection();
            setAdding(true);
            setNone(false);
          }}
          style={styles.addButton}>
          <Ionicons name="add" size={16} color={colors.accent} />
          <Text style={styles.addButtonText}>Add a medicine</Text>
        </Pressable>
      )}

      {medications.length === 0 && !adding ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: none }}
          onPress={() => {
            tapSelection();
            setNone((v) => !v);
          }}
          style={styles.noneRow}>
          <Ionicons name={none ? 'checkbox' : 'square-outline'} size={20} color={colors.accent} />
          <Text style={styles.noneText}>I don&apos;t take any medicines</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const toHhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Adds one reminder time with the system time dial: the clock dialog on Android, a spinner on iOS and the browser's own
// time field on the web. The time goes on as HH:MM; a time already on the list is ignored by the caller.
function TimeAdder({ onAdd }: { onAdd: (time: string) => void }) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scheme = useResolvedScheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => new Date());
  const [webValue, setWebValue] = useState('');

  if (Platform.OS === 'web') {
    // The field keeps what is typed or picked. The time is added with the + button, so a half-typed time is never lost.
    return (
      <View style={styles.timeAdder}>
        <input
          type="time"
          aria-label="Reminder time"
          value={webValue}
          onChange={(e) => setWebValue(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          style={{ height: 30, borderRadius: 999, border: `1px solid ${colors.border}`, background: 'transparent', colorScheme: scheme, padding: '0 10px', fontFamily: 'Poppins_400Regular', fontSize: 12, color: colors.text }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add reminder time"
          disabled={!webValue}
          onPress={() => {
            onAdd(webValue);
            setWebValue('');
          }}
          style={[styles.timeAddBtn, !webValue && { opacity: 0.4 }]}>
          <Ionicons name="add" size={16} color={colors.onAccent} />
        </Pressable>
      </View>
    );
  }

  const onChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'ios') {
      // The spinner stays open; the time is taken when Done is pressed.
      if (selected) setDraft(selected);
      return;
    }
    setOpen(false);
    if (event.type === 'set' && selected) onAdd(toHhmm(selected));
  };

  return (
    <View style={styles.timeAdder}>
      <Pressable accessibilityRole="button" accessibilityLabel="Add reminder time" onPress={() => setOpen(true)} style={styles.timeAddPill}>
        <Ionicons name="time-outline" size={14} color={colors.accent} />
        <Text style={styles.timeAddPillText}>Add time</Text>
      </Pressable>
      {open ? <DateTimePicker value={draft} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'clock'} onChange={onChange} /> : null}
      {open && Platform.OS === 'ios' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onAdd(toHhmm(draft));
            setOpen(false);
          }}
          style={styles.timeAddBtn}>
          <Ionicons name="checkmark" size={16} color={colors.onAccent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  box: { gap: 10 },
  row: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, padding: 12, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 13, color: colors.onSoft },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillChecked: { backgroundColor: colors.accentSoft },
  pillUnmatched: { backgroundColor: colors.warnBg },
  pillText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  pillTextChecked: { color: colors.accent },
  pillTextUnmatched: { color: colors.warnText },
  dose: { height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, fontFamily: 'Poppins_400Regular', fontSize: 13, color: colors.text },
  timesLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: colors.placeholder },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
  timeTagText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: colors.onSoft },
  timeAdder: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeAddPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.accent },
  timeAddPillText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: colors.accent },
  timeAddBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.accent },
  addButtonText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: colors.accent },
  noneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  noneText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: colors.text },
});
