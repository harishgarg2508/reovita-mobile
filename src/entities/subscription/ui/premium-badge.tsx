import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';

// A small "Premium" pill with a lock, shown on a feature that the free plan does not include.
export function PremiumBadge({ locked = true }: { locked?: boolean }) {
  const p = usePalette();
  return (
    <View style={[styles.pill, { backgroundColor: p.accentSoft }]}>
      <Ionicons name={locked ? 'lock-closed' : 'diamond'} size={11} color={p.accent} />
      <Text style={[styles.text, { color: p.accent }]}>Premium</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, height: 24, borderRadius: 12 },
  text: { fontSize: 11.5, fontWeight: '800' },
});
