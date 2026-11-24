import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Skeleton } from '@shared/ui/skeleton';
import { Gap, Rule, Type, usePalette, type Palette } from '@shared/ui/theme';

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

// Where each section's Edit button goes. Each route opens the onboarding step prefilled with the saved values,
// in edit mode (?edit=true): just the fields and an Update button, without the step progress or the step flow.
const EDIT_ROUTE = {
  1: { pathname: '/onboarding/step-1', params: { edit: 'true' } },
  2: { pathname: '/onboarding/step-2', params: { edit: 'true' } },
  3: { pathname: '/onboarding/step-3', params: { edit: 'true' } },
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
        title="Health log"
        query={history}
        rows={() => historyRows(history.data ?? {})}
        emptyText="You have not added your health log yet."
        medications={(history.data?.medications as { name: string | null; dose: string | null }[] | undefined) ?? []}
        showEdit={false}
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
  medications,
  showEdit = true,
}: {
  step: ProfileStepNumber;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  query: { isLoading: boolean; isError: boolean };
  rows: () => Row[];
  emptyText: string;
  medications?: { name: string | null; dose: string | null }[];
  showEdit?: boolean;
}) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const router = useRouter();
  const visible = rows().filter((r) => r.value !== null && r.value !== '');

  // Medical history has its own layout (see MedicalHistory below); the other sections keep the shared rows.
  if (step === 2) {
    return (
      <MedicalHistory
        title={title}
        query={query}
        rows={visible}
        emptyText={emptyText}
        medications={(medications ?? []).filter((m) => m.name)}
      />
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {showEdit ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${title}`} hitSlop={8} onPress={() => router.push(EDIT_ROUTE[step])}>
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        ) : null}
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

      {medications && medications.some((m) => m.name) ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.rowLabel}>Medications</Text>
          {medications
            .filter((m) => m.name)
            .map((m, i) => (
              <View key={`${m.name}-${i}`} style={styles.row}>
                <Text style={styles.rowValue}>{m.name}</Text>
                <Text style={styles.rowLabel}>{m.dose ?? ''}</Text>
              </View>
            ))}
        </View>
      ) : null}

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

// Medical history: the conditions and the family history stack their label over their value, left-aligned, so long values read in full. The medications are a
// list with the dose beside each name. The two actions sit where a reader expects them: Edit current in the header, Show all list 
function MedicalHistory({
  title,
  query,
  rows,
  emptyText,
  medications,
}: {
  title: string;
  query: { isLoading: boolean; isError: boolean };
  rows: Row[];
  emptyText: string;
  medications: { name: string | null; dose: string | null }[];
}) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const router = useRouter();
  const empty = !query.isLoading && !query.isError && rows.length === 0 && medications.length === 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Edit current health log" hitSlop={8} onPress={() => router.push(EDIT_ROUTE[2])}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>

      {query.isLoading ? <Skeleton height={80} /> : null}
      {query.isError ? <Text style={styles.error}>Could not load this section.</Text> : null}
      {empty ? <Text style={styles.empty}>{emptyText}</Text> : null}

      {rows.map((row) => (
        <View key={row.label} style={styles.stackRow}>
          <Text style={styles.stackLabel}>{row.label}</Text>
          <Text style={styles.stackValue}>{row.value}</Text>
        </View>
      ))}

      {medications.length > 0 ? (
        <View style={styles.stackRow}>
          <Text style={styles.stackLabel}>Medications</Text>
          {medications.map((m, i) => (
            <View key={`${m.name}-${i}`} style={styles.medRow}>
              <Text style={[styles.stackValue, styles.flex]}>{m.name}</Text>
              {m.dose ? <Text style={styles.doseText}>{m.dose}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

    </View>
  );
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
    wrap: { gap: Gap.group },
    heading: { ...Type.title, color: p.textStrong },
    subheading: { ...Type.small, color: p.muted, marginTop: -Gap.group + 6 },
    // A section is a title and rows on thin rules: no box, no icon disc.
    card: { gap: 4 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
    cardTitle: { flex: 1, ...Type.heading, color: p.textStrong },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: Rule, borderBottomColor: p.border },
    rowLabel: { flex: 1, ...Type.small, color: p.muted },
    rowValue: { flex: 1.4, ...Type.bodyStrong, color: p.textStrong, textAlign: 'right' },
    empty: { ...Type.small, color: p.muted },
    error: { ...Type.small, color: p.red },
    flex: { flex: 1 },
    stackRow: { gap: 4, paddingVertical: 12, borderBottomWidth: Rule, borderBottomColor: p.border },
    stackLabel: { ...Type.small, color: p.muted },
    stackValue: { ...Type.bodyStrong, color: p.textStrong },
    medRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingTop: 4 },
    doseText: { ...Type.small, color: p.muted },
    editText: { ...Type.label, color: p.accent },
  });
}
