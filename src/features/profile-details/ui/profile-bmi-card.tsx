import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette, useResolvedScheme, type Palette } from '@shared/ui/theme';

import { bmi } from '../model/profile-details.format';
import { useProfileStepSaved } from '../model/use-profile-details';

// Dashboard card: BMI from the saved height and weight. Tapping it opens Basic details to update them.
export function ProfileBmiCard() {
  const p = usePalette();
  const scheme = useResolvedScheme();
  const styles = useMemo(() => makeStyles(p, scheme), [p, scheme]);
  const router = useRouter();
  const basics = useProfileStepSaved(1);
  const d = basics.data ?? {};
  const value = bmi(d.height_cm, d.weight_kg);
  const numeric = value !== null ? Number(value) : null;

  let badgeText = 'HEALTHY';
  let badgeBg = scheme === 'dark' ? '#0F3522' : '#DCFCE7';
  let badgeColor = scheme === 'dark' ? '#4ADE80' : '#15803D';
  let subtitle = 'Optimal weight-to-height ratio';

  if (numeric === null) {
    badgeText = 'SET UP';
    badgeBg = scheme === 'dark' ? '#13344F' : '#E0F2FE';
    badgeColor = scheme === 'dark' ? '#38BDF8' : '#0369A1';
    subtitle = 'Log your height and weight to calculate';
  } else if (numeric < 18.5) {
    badgeText = 'BELOW';
    badgeBg = scheme === 'dark' ? '#443209' : '#FEF3C7';
    badgeColor = scheme === 'dark' ? '#FBBF24' : '#B45309';
    subtitle = 'Below standard healthy range';
  } else if (numeric < 25) {
    badgeText = 'HEALTHY';
    badgeBg = scheme === 'dark' ? '#0F3522' : '#DCFCE7';
    badgeColor = scheme === 'dark' ? '#4ADE80' : '#15803D';
    subtitle = 'Optimal weight-to-height ratio';
  } else if (numeric < 30) {
    badgeText = 'ABOVE';
    badgeBg = scheme === 'dark' ? '#3D1E0C' : '#FED7AA';
    badgeColor = scheme === 'dark' ? '#FB923C' : '#C2410C';
    subtitle = 'Above standard healthy range';
  } else {
    badgeText = 'HIGH';
    badgeBg = scheme === 'dark' ? '#3D1822' : '#FEE2E2';
    badgeColor = scheme === 'dark' ? '#FB7185' : '#B91C1C';
    subtitle = 'Well above standard healthy range';
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Body mass index. Open basic details"
      onPress={() => router.push({ pathname: '/onboarding/step-1', params: { edit: 'true' } })}
      style={({ pressed }) => [
        styles.card,
        {
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}>
      <View style={styles.iconTile}>
        <Ionicons name="body-outline" size={24} color={scheme === 'dark' ? '#34D399' : '#059669'} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>BMI</Text>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.rightRow}>
        {numeric !== null ? <Text style={styles.value}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={p.muted} />
      </View>
    </Pressable>
  );
}

function makeStyles(p: Palette, scheme: 'light' | 'dark') {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    iconTile: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: scheme === 'dark' ? '#0D2E1C' : '#E6F9F0',
    },
    content: {
      flex: 1,
      gap: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: p.textStrong,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 13,
      color: p.muted,
      lineHeight: 18,
    },
    rightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    value: {
      fontSize: 22,
      fontWeight: '800',
      color: p.textStrong,
      letterSpacing: -0.5,
      marginRight: 2,
    },
  });
}
