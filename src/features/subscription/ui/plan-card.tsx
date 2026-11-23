import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Rule, Type, usePalette } from '@shared/ui/theme';
import { useSubscription } from '@entities/subscription';

// A small card for the profile: the plan (Free or Premium) and a way to open the plan screen.
export function PlanCard() {
  const p = usePalette();
  const router = useRouter();
  const plan = useSubscription();
  const premium = plan.isPremium;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Your plan" onPress={() => router.push('/(app)/subscription' as Href)} style={[styles.row, { borderColor: p.border }]}>
      <View style={styles.icon}>
        <Ionicons name={premium ? 'diamond' : 'diamond-outline'} size={22} color={p.accent} />
      </View>
      <View style={styles.text}>
        <Text style={[Type.bodyStrong, { color: premium ? p.accent : p.text }]}>{premium ? 'Premium' : 'Free plan'}</Text>
        <Text numberOfLines={2} style={[Type.small, { color: p.muted }]}>
          {premium ? 'Everything is unlocked.' : 'Unlock food scans, guidance, briefing and Social.'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={p.muted} />
    </Pressable>
  );
}

// The plan is a row between two thin rules, like the other lists in the app.
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderTopWidth: Rule, borderBottomWidth: Rule },
  icon: { width: 28, alignItems: 'center' },
  text: { flex: 1, minWidth: 0, gap: 1 },
});
