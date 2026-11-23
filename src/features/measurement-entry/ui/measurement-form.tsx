import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMeasurements, type Measurement, type MeasurementType } from '@entities/measurement';
import { isApiError } from '@shared/api';
import { tapConfirm, USE_NATIVE_DRIVER, useScrollToTopOnFocus } from '@shared/lib';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { usePalette, type Palette } from '@shared/ui/theme';

import { useCreateMeasurement } from '../model/use-create-measurement';

// Allowed values, the same ranges the server checks (see MEASUREMENT_RANGES in the API).
const RANGE = {
  sys: { min: 60, max: 260, unit: 'mmHg', label: 'Top (systolic) blood pressure' },
  dia: { min: 30, max: 200, unit: 'mmHg', label: 'Bottom (diastolic) blood pressure' },
  weight: { min: 20, max: 300, unit: 'kg', label: 'Weight' },
} as const;

function inRange(value: string, range: { min: number; max: number }): boolean {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n >= range.min && n <= range.max;
}

// Blood pressure and weight entry (spec section 5). Readings go to the server, which checks ranges and consent.
export function MeasurementEntryScreen() {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const recent = useMeasurements();
  const save = useCreateMeasurement();

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [weight, setWeight] = useState('');
  // The message and the card it belongs to, so it shows under that card.
  const [error, setErrorState] = useState<{ section: 'bp' | 'weight'; message: string } | null>(null);
  const [savedNote, setSavedNoteState] = useState<{ section: 'bp' | 'weight'; message: string } | null>(null);
  const [section, setSection] = useState<'bp' | 'weight'>('bp');
  // The reading whose drawer is open. Each reading has its own drawer with its own fields.
  const [sheet, setSheet] = useState<'bp' | 'weight' | null>(null);
  // Fields that failed validation after a save attempt. They turn red until the user changes them.
  const [bad, setBad] = useState<{ sys?: boolean; dia?: boolean; weight?: boolean }>({});

  // Opening animation: the page fades in and slides up a little.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 320, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [enter]);

  function openSheet(which: 'bp' | 'weight') {
    setSection(which);
    setErrorState(null);
    setSavedNoteState(null);
    setBad({});
    setSheet(which);
  }

  function fail(err: unknown) {
    setSavedNoteState(null);
    setErrorState({ section, message: isApiError(err) ? err.message : 'Could not save the reading. Try again.' });
  }

  function saveBp() {
    setSection('bp');
    setErrorState(null);
    const sysOk = inRange(systolic, RANGE.sys);
    const diaOk = inRange(diastolic, RANGE.dia);
    setBad({ sys: !sysOk, dia: !diaOk });
    if (!sysOk || !diaOk) {
      setErrorState({ section: 'bp', message: `Enter a top number from ${RANGE.sys.min} to ${RANGE.sys.max} and a bottom number from ${RANGE.dia.min} to ${RANGE.dia.max}.` });
      return;
    }
    const sys = Number(systolic);
    const dia = Number(diastolic);
    tapConfirm();
    const measured_at = new Date().toISOString();
    save.mutate(
      [
        { type: 'bp_sys', value: sys, measured_at },
        { type: 'bp_dia', value: dia, measured_at },
      ],
      {
        onSuccess: () => {
          setSystolic('');
          setDiastolic('');
          setSavedNoteState({ section: 'bp', message: 'Blood pressure saved.' });
          setSheet(null);
        },
        onError: fail,
      },
    );
  }

  function saveWeight() {
    setSection('weight');
    setErrorState(null);
    const weightOk = inRange(weight, RANGE.weight);
    setBad({ weight: !weightOk });
    if (!weightOk) {
      setErrorState({ section: 'weight', message: `Enter your weight in kg, from ${RANGE.weight.min} to ${RANGE.weight.max}.` });
      return;
    }
    const kg = Number(weight);
    tapConfirm();
    save.mutate([{ type: 'weight_kg', value: kg, measured_at: new Date().toISOString() }], {
      onSuccess: () => {
        setWeight('');
        setSavedNoteState({ section: 'weight', message: 'Weight saved.' });
        setSheet(null);
      },
      onError: fail,
    });
  }

  // The newest reading of each kind, for the rows.
  const latest: Record<string, { value: string; day: string } | undefined> = {};
  for (const group of groupLog(recent.data ?? [])) {
    for (const entry of group.entries) {
      if (!latest[entry.title]) latest[entry.title] = { value: entry.value, day: group.day };
    }
  }

  return (
    <Animated.View
      style={[
        styles.scroll,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}>
    <ScrollView ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={p.text} />
        </Pressable>
        <Text style={styles.title}>Vitals</Text>
      </View>
      <Text style={styles.subtitle}>Log your blood pressure and weight. They feed your cardiovascular and metabolic scores.</Text>

      {/* One row for each reading: the latest value, and a tap that opens its own drawer to add a new one. */}
      <View style={styles.list}>
        {(
          [
            { key: 'bp', icon: 'heart-outline', title: 'Blood pressure', action: 'Add reading', empty: 'No reading yet' },
            { key: 'weight', icon: 'body-outline', title: 'Weight', action: 'Add reading', empty: 'No reading yet' },
          ] as const
        ).map((row) => {
          const last = latest[row.title];
          return (
            <Pressable key={row.key} accessibilityRole="button" accessibilityLabel={`${row.action}: ${row.title}`} onPress={() => openSheet(row.key)} style={styles.listRow}>
              <View style={[styles.listIcon, { backgroundColor: p.accentSoft }]}>
                <Ionicons name={row.icon} size={20} color={p.accent} />
              </View>
              <View style={styles.listText}>
                <Text style={styles.cardTitle}>{row.title}</Text>
                <Text style={styles.hint}>{last ? `${last.value}, ${last.day}` : row.empty}</Text>
              </View>
              <Ionicons name="add-circle-outline" size={24} color={p.accent} />
            </Pressable>
          );
        })}
      </View>
      {savedNote && !sheet ? <Text style={styles.ok}>{savedNote.message}</Text> : null}

      <Text style={styles.sectionLabel}>Recent readings</Text>
      {recent.isPending ? <ActivityIndicator color={p.accent} /> : null}
      {recent.data?.length === 0 ? <Text style={styles.empty}>No readings yet.</Text> : null}
      {groupLog(recent.data ?? []).map((group) => (
        <View key={group.day} style={styles.logDay}>
          <Text style={styles.logDate}>{group.day}</Text>
          {group.entries.map((entry) => (
            <View key={entry.key} style={styles.logEntry}>
              <Text style={styles.logTime}>{entry.time}</Text>
              <View style={styles.logBody}>
                <Text style={styles.logTitle}>{entry.title}</Text>
                <Text style={styles.logValue}>{entry.value}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>

    <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)}>
      {sheet === 'bp' ? (
        <View style={styles.sheetBody}>
          <View style={styles.cardHead}>
            <Ionicons name="heart-outline" size={20} color={p.accent} />
            <Text style={styles.cardTitle}>Blood pressure</Text>
          </View>
          <View style={styles.row}>
            <Field label="Top (mmHg)" value={systolic} onChange={(v) => { setSystolic(v); setBad((b) => ({ ...b, sys: false })); }} styles={styles} min={RANGE.sys.min} max={RANGE.sys.max} invalid={bad.sys} />
            <Field label="Bottom (mmHg)" value={diastolic} onChange={(v) => { setDiastolic(v); setBad((b) => ({ ...b, dia: false })); }} styles={styles} min={RANGE.dia.min} max={RANGE.dia.max} invalid={bad.dia} />
          </View>
          <Text style={[styles.hint, (bad.sys || bad.dia) && styles.hintBad]}>
            Top {RANGE.sys.min} to {RANGE.sys.max}, bottom {RANGE.dia.min} to {RANGE.dia.max} {RANGE.sys.unit}
          </Text>
          {error?.section === 'bp' ? <Text style={styles.error}>{error.message}</Text> : null}
          <Pressable accessibilityRole="button" onPress={saveBp} disabled={save.isPending} style={styles.saveBtn}>
            {save.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save blood pressure</Text>}
          </Pressable>
        </View>
      ) : null}
      {sheet === 'weight' ? (
        <View style={styles.sheetBody}>
          <View style={styles.cardHead}>
            <Ionicons name="body-outline" size={20} color={p.accent} />
            <Text style={styles.cardTitle}>Weight</Text>
          </View>
          <Field decimal label="Weight (kg)" value={weight} onChange={(v) => { setWeight(v); setBad((b) => ({ ...b, weight: false })); }} styles={styles} min={RANGE.weight.min} max={RANGE.weight.max} invalid={bad.weight} />
          <Text style={[styles.hint, bad.weight && styles.hintBad]}>
            {RANGE.weight.min} to {RANGE.weight.max} {RANGE.weight.unit}
          </Text>
          {error?.section === 'weight' ? <Text style={styles.error}>{error.message}</Text> : null}
          <Pressable accessibilityRole="button" onPress={saveWeight} disabled={save.isPending} style={styles.saveBtn}>
            {save.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save weight</Text>}
          </Pressable>
        </View>
      ) : null}
    </BottomSheet>
    </Animated.View>
  );
}

function Field({
  label,
  value,
  onChange,
  styles,
  invalid = false,
  decimal = false,
  max = 999,
}: {
  label: string;
  decimal?: boolean;
  value: string;
  onChange: (v: string) => void;
  styles: Styles;
  min?: number;
  max?: number;
  invalid?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        // Digits only (and one point for weight), so letters and symbols cannot be typed or pasted.
        onChangeText={(text) => onChange(decimal ? text.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d{0,1}).*$/, '$1') : text.replace(/\D/g, ''))}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        // As many characters as the largest allowed value has digits, plus a point and one decimal for weight.
        maxLength={String(max).length + (decimal ? 2 : 0)}
        placeholder="—"
        placeholderTextColor="#9185AA"
        style={[styles.input, invalid && styles.inputInvalid]}
      />
    </View>
  );
}

type LogEntry = { key: string; time: string; title: string; value: string };
type LogDay = { day: string; entries: LogEntry[] };

// Turns the saved readings into a log grouped by day, newest first. A top and bottom pair saved together is one entry.
function groupLog(readings: Measurement[]): LogDay[] {
  const sorted = [...readings].sort((a, b) => (a.measured_at < b.measured_at ? 1 : -1));
  const used = new Set<string>();
  const entries: { at: Date; entry: LogEntry }[] = [];

  for (const r of sorted) {
    if (used.has(r.id)) continue;
    const at = new Date(r.measured_at);
    if (r.type === 'weight_kg') {
      used.add(r.id);
      entries.push({ at, entry: { key: r.id, time: formatTime(at), title: 'Weight', value: `${r.value} kg` } });
      continue;
    }
    if (r.type === 'bp_sys' || r.type === 'bp_dia') {
      // Pair the top with the bottom reading saved at the same moment (within a second).
      const other = sorted.find(
        (o) =>
          !used.has(o.id) &&
          o.id !== r.id &&
          o.type !== 'weight_kg' &&
          o.type !== r.type &&
          Math.abs(new Date(o.measured_at).getTime() - at.getTime()) < 1000,
      );
      used.add(r.id);
      const sys = r.type === 'bp_sys' ? r : other;
      const dia = r.type === 'bp_dia' ? r : other;
      if (other) used.add(other.id);
      entries.push({
        at,
        entry: {
          key: r.id,
          time: formatTime(at),
          title: 'Blood pressure',
          value: `${sys ? sys.value : '-'} / ${dia ? dia.value : '-'} mmHg`,
        },
      });
    }
  }

  const days = new Map<string, LogDay>();
  for (const { at, entry } of entries) {
    const day = formatDay(at);
    const bucket = days.get(day) ?? { day, entries: [] };
    bucket.entries.push(entry);
    days.set(day, bucket);
  }
  return [...days.values()];
}

function formatDay(at: Date): string {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(at, today)) return 'Today';
  if (same(at, yesterday)) return 'Yesterday';
  return at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(at: Date): string {
  return at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

const READING_LABEL: Record<MeasurementType, string> = {
  bp_sys: 'Blood pressure (top)',
  bp_dia: 'Blood pressure (bottom)',
  weight_kg: 'Weight',
};
const READING_UNIT: Record<MeasurementType, string> = { bp_sys: 'mmHg', bp_dia: 'mmHg', weight_kg: 'kg' };

function ReadingRow({ reading, styles }: { reading: Measurement; styles: Styles }) {
  return (
    <View style={styles.reading}>
      <Text style={styles.readingLabel}>{READING_LABEL[reading.type]}</Text>
      <Text style={styles.readingValue}>
        {reading.value} {READING_UNIT[reading.type]}
      </Text>
      <Text style={styles.readingDate}>
        {new Date(reading.measured_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </Text>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(p: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.bg },
    container: { paddingHorizontal: 20, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 26, fontFamily: 'Poppins_600SemiBold', color: p.textStrong },
    subtitle: { fontSize: 13, color: p.muted },
    card: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border, paddingTop: 20, paddingBottom: 4, gap: 14 },
    list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.border },
    listIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    listText: { flex: 1, gap: 2 },
    sheetBody: { gap: 14, paddingBottom: 8 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: p.textStrong },
    row: { flexDirection: 'row', gap: 12 },
    field: { flex: 1, gap: 6 },
    label: { fontSize: 12.5, color: p.muted },
    inputInvalid: { borderColor: '#C22F43', borderWidth: 1.5 },
    hint: { fontSize: 12.5, color: p.muted },
    hintBad: { color: p.red, fontFamily: 'Poppins_600SemiBold' },
    input: {
      height: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.surface,
      paddingHorizontal: 14,
      fontSize: 16,
      color: p.textStrong,
    },
    saveBtn: { height: 46, borderRadius: 16, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    saveText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
    error: { fontSize: 13, color: p.red },
    ok: { fontSize: 13, color: p.accent },
    sectionLabel: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: p.textStrong, marginTop: 4 },
    empty: { fontSize: 13, color: p.muted },
    reading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 16,
      backgroundColor: p.card,
      borderWidth: 1,
      borderColor: p.border,
    },
    logDay: { gap: 8, marginTop: 6 },
    logDate: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: p.muted },
    logEntry: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: p.card,
      borderWidth: 1,
      borderColor: p.border,
    },
    logTime: { width: 72, fontSize: 13, color: p.muted },
    logBody: { flex: 1, gap: 2 },
    logTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: p.textStrong },
    logValue: { fontSize: 14, color: p.text },
    readingLabel: { flex: 1, fontSize: 14, color: p.textStrong },
    readingValue: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: p.textStrong },
    readingDate: { fontSize: 12.5, color: p.muted, minWidth: 56, textAlign: 'right' },
  });
}
