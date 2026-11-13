import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMeasurements, type Measurement, type MeasurementType } from '@entities/measurement';
import { isApiError } from '@shared/api';
import { tapConfirm, USE_NATIVE_DRIVER } from '@shared/lib';
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
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const recent = useMeasurements();
  const save = useCreateMeasurement();

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  // Fields that failed validation after a save attempt. They turn red until the user changes them.
  const [bad, setBad] = useState<{ sys?: boolean; dia?: boolean; weight?: boolean }>({});
  const [infoOpen, setInfoOpen] = useState(false);

  // Opening animation: the page fades in and slides up a little.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 320, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [enter]);

  function fail(err: unknown) {
    setSavedNote(null);
    setError(isApiError(err) ? err.message : 'Could not save the reading. Try again.');
  }

  function saveBp() {
    setError(null);
    const sysOk = inRange(systolic, RANGE.sys);
    const diaOk = inRange(diastolic, RANGE.dia);
    setBad({ sys: !sysOk, dia: !diaOk });
    if (!sysOk || !diaOk) {
      setError(`Enter a top number from ${RANGE.sys.min} to ${RANGE.sys.max} and a bottom number from ${RANGE.dia.min} to ${RANGE.dia.max}.`);
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
          setSavedNote('Blood pressure saved.');
        },
        onError: fail,
      },
    );
  }

  function saveWeight() {
    setError(null);
    const weightOk = inRange(weight, RANGE.weight);
    setBad({ weight: !weightOk });
    if (!weightOk) {
      setError(`Enter your weight in kg, from ${RANGE.weight.min} to ${RANGE.weight.max}.`);
      return;
    }
    const kg = Number(weight);
    tapConfirm();
    save.mutate([{ type: 'weight_kg', value: kg, measured_at: new Date().toISOString() }], {
      onSuccess: () => {
        setWeight('');
        setSavedNote('Weight saved.');
      },
      onError: fail,
    });
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={p.text} />
        </Pressable>
        <Text style={styles.title}>Vitals</Text>
      </View>
      <Text style={styles.subtitle}>Log your blood pressure and weight. They feed your cardiovascular and metabolic scores.</Text>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Ionicons name="heart-outline" size={20} color={p.accent} />
          <Text style={styles.cardTitle}>Blood pressure</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Allowed values" onPress={() => setInfoOpen(true)} hitSlop={8} style={styles.infoBtn}>
            <Ionicons name="information-circle-outline" size={22} color={p.muted} />
          </Pressable>
        </View>
        <View style={styles.row}>
          <Field label="Top (mmHg)" value={systolic} onChange={(v) => { setSystolic(v); setBad((b) => ({ ...b, sys: false })); }} styles={styles} min={RANGE.sys.min} max={RANGE.sys.max} invalid={bad.sys} />
          <Field label="Bottom (mmHg)" value={diastolic} onChange={(v) => { setDiastolic(v); setBad((b) => ({ ...b, dia: false })); }} styles={styles} min={RANGE.dia.min} max={RANGE.dia.max} invalid={bad.dia} />
        </View>
        <Pressable accessibilityRole="button" onPress={saveBp} disabled={save.isPending} style={styles.saveBtn}>
          {save.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save blood pressure</Text>}
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Ionicons name="body-outline" size={20} color={p.accent} />
          <Text style={styles.cardTitle}>Weight</Text>
        </View>
        <Field label="Weight (kg)" value={weight} onChange={(v) => { setWeight(v); setBad((b) => ({ ...b, weight: false })); }} styles={styles} min={RANGE.weight.min} max={RANGE.weight.max} invalid={bad.weight} />
        <Pressable accessibilityRole="button" onPress={saveWeight} disabled={save.isPending} style={styles.saveBtn}>
          {save.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save weight</Text>}
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {savedNote && !error ? <Text style={styles.ok}>{savedNote}</Text> : null}

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
      <Modal visible={infoOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setInfoOpen(false)}>
        <Pressable style={styles.infoBackdrop} onPress={() => setInfoOpen(false)}>
          <Pressable style={styles.infoSheet} onPress={() => undefined}>
            <Text style={styles.cardTitle}>Allowed values</Text>
            <Text style={styles.infoRow}>
              {RANGE.sys.label}: {RANGE.sys.min} to {RANGE.sys.max} {RANGE.sys.unit}
            </Text>
            <Text style={styles.infoRow}>
              {RANGE.dia.label}: {RANGE.dia.min} to {RANGE.dia.max} {RANGE.dia.unit}
            </Text>
            <Text style={styles.infoRow}>
              {RANGE.weight.label}: {RANGE.weight.min} to {RANGE.weight.max} {RANGE.weight.unit}
            </Text>
            <Text style={styles.infoRow}>Fields in red need a value in the range above.</Text>
            <Pressable accessibilityRole="button" onPress={() => setInfoOpen(false)} style={styles.infoClose}>
              <Text style={styles.saveText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

function Field({
  label,
  value,
  onChange,
  styles,
  invalid = false,
}: {
  label: string;
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
        onChangeText={onChange}
        keyboardType="decimal-pad"
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
    title: { fontSize: 26, fontWeight: '800', color: p.textStrong },
    subtitle: { fontSize: 13, color: p.muted },
    card: { backgroundColor: p.card, borderRadius: 22, borderWidth: 1, borderColor: p.border, padding: 16, gap: 12 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: p.textStrong },
    row: { flexDirection: 'row', gap: 12 },
    field: { flex: 1, gap: 6 },
    label: { fontSize: 12.5, color: p.muted },
    inputInvalid: { borderColor: '#C22F43', borderWidth: 1.5 },
    infoBtn: { marginLeft: 'auto', padding: 4 },
    infoBackdrop: { flex: 1, backgroundColor: p.bg, justifyContent: 'center', padding: 20 },
    infoSheet: { backgroundColor: p.card, borderRadius: 22, borderWidth: 1, borderColor: p.border, padding: 20, gap: 10 },
    infoRow: { fontSize: 14, lineHeight: 20, color: p.muted },
    infoClose: { marginTop: 8, height: 46, borderRadius: 16, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
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
    saveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    error: { fontSize: 13, color: p.red },
    ok: { fontSize: 13, color: p.accent },
    sectionLabel: { fontSize: 15, fontWeight: '700', color: p.textStrong, marginTop: 4 },
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
    logDate: { fontSize: 13, fontWeight: '700', color: p.muted, textTransform: 'uppercase' },
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
    logTitle: { fontSize: 14, fontWeight: '700', color: p.textStrong },
    logValue: { fontSize: 14, color: p.text },
    readingLabel: { flex: 1, fontSize: 14, color: p.textStrong },
    readingValue: { fontSize: 14, fontWeight: '700', color: p.textStrong },
    readingDate: { fontSize: 12.5, color: p.muted, minWidth: 56, textAlign: 'right' },
  });
}
