import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { ScoreTrend } from '../model/score.types';

const LOOK: Record<ScoreTrend, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  Improving: { icon: 'trending-up', color: '#1F7A3E', bg: '#E6F2EA' },
  Declining: { icon: 'trending-down', color: '#C22F43', bg: '#FDEEF0' },
  Stable: { icon: 'remove', color: '#6E6A82', bg: '#F1EFF8' },
};

// Small pill that says how a score moved compared with the one before it.
export function ScoreTrendBadge({ trend }: { trend: ScoreTrend }) {
  const look = LOOK[trend] ?? LOOK.Stable;
  return (
    <View style={[styles.pill, { backgroundColor: look.bg }]} accessibilityLabel={`Trend: ${trend}`}>
      <Ionicons name={look.icon} size={14} color={look.color} />
      <Text style={[styles.text, { color: look.color }]}>{trend}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  text: { fontSize: 12, fontWeight: '700' },
});
