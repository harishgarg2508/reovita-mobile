import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Skeleton } from '@shared/ui/skeleton';
import { Rule, Type, usePalette, type Palette } from '@shared/ui/theme';

import { bmi } from '../model/profile-details.format';
import { useProfileStepSaved } from '../model/use-profile-details';

// Standard BMI bands, used only to label the number. This is information, not a diagnosis.
function bmiBand(value: number): string {
  if (value < 18.5) return 'Below healthy range';
  if (value < 25) return 'Healthy range';
  if (value < 30) return 'Above healthy range';
  return 'Well above healthy range';
}

// Dashboard card: BMI from the saved height and weight. Tapping it opens Basic details to update them.
export function ProfileBmiCard() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const router = useRouter();
  const basics = useProfileStepSaved(1);
  const d = basics.data ?? {};
  const value = bmi(d.height_cm, d.weight_kg);
  const numeric = value !== null ? Number(value) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Body mass index. Open basic details"
      onPress={() => router.push({ pathname: '/onboarding/step-1', params: { edit: 'true' } })}
      style={styles.row}>
      <View style={styles.icon}>
        <Ionicons name="body-outline" size={22} color={p.accent} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.title}>BMI</Text>
        {basics.isLoading ? (
          <Skeleton height={18} style={{ width: '50%' }} />
        ) : numeric !== null ? (
          <Text style={styles.text}>{bmiBand(numeric)}</Text>
        ) : (
          <Text style={styles.text}>Add your height and weight to see your BMI.</Text>
        )}
      </View>
      {numeric !== null ? <Text style={styles.value}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={p.muted} />
    </Pressable>
  );
}

// A row of the dashboard list: it sits on a thin rule, like the rows under it.
function makeStyles(p: Palette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: Rule, borderBottomColor: p.border },
    icon: { width: 28, alignItems: 'center' },
    flex: { flex: 1, gap: 1 },
    title: { ...Type.bodyStrong, color: p.textStrong },
    text: { ...Type.small, color: p.muted },
    value: { ...Type.title, color: p.textStrong },
  });
}
