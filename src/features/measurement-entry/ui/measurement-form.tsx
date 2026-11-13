import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMeasurements, type Measurement, type MeasurementType } from '@entities/measurement';
import { isApiError } from '@shared/api';
import { tapConfirm, USE_NATIVE_DRIVER } from '@shared/lib';
import { usePalette, type Palette } from '@shared/ui/theme';

import { useCreateMeasurement } from '../model/use-create-measurement';

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
    const sys = Number(systolic);
    const dia = Number(diastolic);
    if (!systolic || !diastolic || !Number.isFinite(sys) || !Number.isFinite(dia)) {
      setError('Enter both the top and bottom number.');
      return;
    }
    tapConfirm();
    save.mutate(
      [
        { type: 'bp_sys', value: sys },
        { type: 'bp_dia', value: dia },
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
    const kg = Number(weight);
    if (!weight || !Number.isFinite(kg)) {
      setError('Enter your weight in kg.');
      return;
    }
    tapConfirm();
    save.mutate([{ type: 'weight_kg', value: kg }], {
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
        </View>
        <View style={styles.row}>
          <Field label="Top (mmHg)" value={systolic} onChange={setSystolic} styles={styles} />
          <Field label="Bottom (mmHg)" value={diastolic} onChange={setDiastolic} styles={styles} />
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
        <Field label="Weight (kg)" value={weight} onChange={setWeight} styles={styles} />
        <Pressable accessibilityRole="button" onPress={saveWeight} disabled={save.isPending} style={styles.saveBtn}>
          {save.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save weight</Text>}
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {savedNote && !error ? <Text style={styles.ok}>{savedNote}</Text> : null}

      <Text style={styles.sectionLabel}>Recent readings</Text>
      {recent.isPending ? <ActivityIndicator color={p.accent} /> : null}
      {recent.data?.length === 0 ? <Text style={styles.empty}>No readings yet.</Text> : null}
      {(recent.data ?? []).slice(0, 10).map((m) => (
        <ReadingRow key={m.id} reading={m} styles={styles} />
      ))}
    </ScrollView>
    </Animated.View>
  );
}

function Field({
  label,
  value,
  onChange,
  styles,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  styles: Styles;
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
        style={styles.input}
      />
    </View>
  );
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
    readingLabel: { flex: 1, fontSize: 14, color: p.textStrong },
    readingValue: { fontSize: 14, fontWeight: '700', color: p.textStrong },
    readingDate: { fontSize: 12.5, color: p.muted, minWidth: 56, textAlign: 'right' },
  });
}
