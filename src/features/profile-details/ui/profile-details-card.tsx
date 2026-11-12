import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Skeleton } from '@shared/ui/skeleton';
import { usePalette, type Palette } from '@shared/ui/theme';

import {
  activityLabel,
  alcoholLabel,
  ageFrom,
  bmi,
  conditionLabel,
  dietLabel,
  exerciseLabel,
  occupationLabel,
  RELATION_ORDER,
  relationLabel,
  sexLabel,
  smokingLabel,
} from '../model/profile-details.format';
import { useProfileStepSaved, type ProfileStepNumber } from '../model/use-profile-details';

// Where each section's Edit button goes. Each route opens the onboarding step prefilled with the saved values.
const EDIT_ROUTE = {
  1: '/onboarding/step-1',
  2: '/onboarding/step-2',
  3: '/onboarding/step-3',
} as const;

type Row = { label: string; value: string | null };

// The three saved sections of the profile: basics, medical history and lifestyle.
export function ProfileDetailsCard() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const basics = useProfileStepSaved(1);
  const history = useProfileStepSaved(2);
  const lifestyle = useProfileStepSaved(3);

  // Refetch whenever the tab is shown again, so changes saved in an onboarding step appear here.
  useFocusEffect(
    useCallback(() => {
      void basics.refetch();
      void history.refetch();
      void lifestyle.refetch();
    }, [basics.refetch, history.refetch, lifestyle.refetch]),
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>My details</Text>
      <Text style={styles.subheading}>Review what you filled in, and update anything that has changed.</Text>

      <Section
        step={1}
        icon="body-outline"
        title="Basic details"
        query={basics}
        rows={() => basicsRows(basics.data ?? {})}
        emptyText="You have not added your basic details yet."
      />
      <Section
        step={2}
        icon="medkit-outline"
        title="Medical history"
        query={history}
        rows={() => historyRows(history.data ?? {})}
        emptyText="You have not added your medical history yet."
      />
      <Section
        step={3}
        icon="leaf-outline"
        title="Lifestyle"
        query={lifestyle}
        rows={() => lifestyleRows(lifestyle.data ?? {})}
        emptyText="You have not added your lifestyle details yet."
      />
    </View>
  );
}

function Section({
  step,
  icon,
  title,
  query,
  rows,
  emptyText,
}: {
  step: ProfileStepNumber;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  query: { isLoading: boolean; isError: boolean };
  rows: () => Row[];
  emptyText: string;
}) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const router = useRouter();
  const visible = rows().filter((r) => r.value !== null && r.value !== '');

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBubble}>
          <Ionicons name={icon} size={20} color={p.accent} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>

      {query.isLoading ? <Skeleton height={80} /> : null}
      {query.isError ? <Text style={styles.error}>Could not load this section.</Text> : null}

      {!query.isLoading && !query.isError && visible.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : null}

      {visible.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowValue}>{row.value}</Text>
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${title}`}
        onPress={() => router.push(EDIT_ROUTE[step])}
        style={styles.editBtn}>
        <Ionicons name="create-outline" size={16} color={p.accent} />
        <Text style={styles.editText}>Edit</Text>
      </Pressable>
    </View>
  );
}

function basicsRows(d: Record<string, unknown>): Row[] {
  const age = ageFrom(d.birth_year);
  const heightCm = d.height_cm != null ? `${d.height_cm} cm` : null;
  const weightKg = d.weight_kg != null ? `${d.weight_kg} kg` : null;
  const index = bmi(d.height_cm, d.weight_kg);
  return [
    { label: 'Sex', value: sexLabel(d.sex) },
    { label: 'Birth year', value: d.birth_year != null ? String(d.birth_year) : null },
    { label: 'Age', value: age !== null ? `${age} years` : null },
    { label: 'Height', value: heightCm },
    { label: 'Weight', value: weightKg },
    { label: 'BMI', value: index },
  ];
}

function historyRows(d: Record<string, unknown>): Row[] {
  const conditions = (d.conditions as { tag: string; free_text: string | null }[] | undefined) ?? [];
  const family = (d.family_history as { relation: string; condition: string }[] | undefined) ?? [];
  const medications = (d.medications as { name: string | null; dose: string | null }[] | undefined) ?? [];

  const conditionText = conditions.map((c) => conditionLabel(c.tag, c.free_text)).join(', ');
  const medicationText = medications
    .filter((m) => m.name)
    .map((m) => (m.dose ? `${m.name} (${m.dose})` : m.name))
    .join(', ');

  const familyRows: Row[] = RELATION_ORDER.map((relation) => {
    const items = family.filter((f) => f.relation === relation).map((f) => f.condition);
    return { label: `${relationLabel(relation)} history`, value: items.length ? items.join(', ') : null };
  });

  return [
    { label: 'Conditions', value: conditionText || null },
    { label: 'Medications', value: medicationText || null },
    ...familyRows,
  ];
}

function lifestyleRows(d: Record<string, unknown>): Row[] {
  return [
    { label: 'Average sleep', value: d.sleep != null ? `${d.sleep} hours` : null },
    { label: 'Stress (1 low, 5 high)', value: d.stress != null ? String(d.stress) : null },
    { label: 'Diet', value: dietLabel(d.diet) },
    { label: 'Smoking', value: smokingLabel(d.smoking) },
    { label: 'Alcohol', value: alcoholLabel(d.alcohol) },
    { label: 'Exercise', value: exerciseLabel(d.exercise) },
    { label: 'Occupation', value: occupationLabel(d.occupation) },
    { label: 'Daily activity', value: activityLabel(d.activity_level) },
  ];
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    wrap: { gap: 14 },
    heading: { fontSize: 20, fontWeight: '800', color: p.textStrong },
    subheading: { fontSize: 13, color: p.muted, marginTop: -8 },
    card: {
      backgroundColor: p.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: p.border,
      padding: 18,
      gap: 12,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBubble: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: p.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: p.textStrong },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    rowLabel: { flex: 1, fontSize: 13, color: p.muted },
    rowValue: { flex: 1.4, fontSize: 14, fontWeight: '600', color: p.textStrong, textAlign: 'right' },
    empty: { fontSize: 13, color: p.muted },
    error: { fontSize: 13, color: p.red },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: p.accent,
    },
    editText: { fontSize: 14, fontWeight: '600', color: p.accent },
  });
}
