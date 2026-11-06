import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Reovita Daily Briefing Card.
 * Exact recreation from Screen 2 (Home Dashboard):
 * - Soft pastel red/pink background (#FDEEF0)
 * - "Daily Briefing" header
 * - "High" red priority pill badge
 * - "Your cholesterol levels are elevated. Consider discussing with your doctor." message
 * - Right chevron '>'
 */
export function LatestBriefingCard({ briefing }: { briefing: string }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="View daily briefing"
      onPress={() => router.push('/(app)/briefings')}
      style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Briefing</Text>
      </View>

      <View style={styles.bodyRow}>
        <Text style={styles.body}>{briefing}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FDEEF0',
    borderWidth: 1,
    borderColor: '#FAD4D8',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#651E28',
  },
  badge: {
    backgroundColor: '#FCE0E3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E34255',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#651E28',
    opacity: 0.9,
    paddingRight: 8,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E34255',
  },
});
