import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';
import { useSubscription } from '@entities/subscription';

// A small card for the profile: the plan (Free or Premium) and a way to open the plan screen.
export function PlanCard() {
  const p = usePalette();
  const router = useRouter();
  const plan = useSubscription();
  const premium = plan.isPremium;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Your plan" onPress={() => router.push('/(app)/subscription' as Href)} style={[styles.card, { backgroundColor: p.card, borderColor: premium ? p.accent : p.border }]}>
      <View style={[styles.icon, { backgroundColor: p.accentSoft }]}>
        <Ionicons name={premium ? 'diamond' : 'diamond-outline'} size={20} color={p.accent} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: p.text }]}>{premium ? 'Premium' : 'Free plan'}</Text>
        <Text numberOfLines={1} style={[styles.hint, { color: p.muted }]}>
          {premium ? 'Everything is unlocked.' : 'Unlock food scans, guidance, briefing and Social.'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={p.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 14 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 15, fontWeight: '800' },
  hint: { fontSize: 12.5 },
});
