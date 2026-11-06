import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WarningTriangleIcon } from '@shared/ui';

/**
 * Reovita Critical Health Banner.
 * Exact recreation from Screen 2 (Home Dashboard):
 * - Coral-red background (#FDEEF0) with rounded corners
 * - Red rounded warning triangle with white exclamation mark
 * - "Contact your doctor now!" title and "Critical findings in your report." subtitle
 * - Right chevron '>'
 */
export function CriticalHealthBanner() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Contact your doctor now"
      onPress={() => router.push('/(app)/notifications')}
      style={styles.card}>
      <View style={styles.iconWrap}>
        <WarningTriangleIcon size={32} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Contact your doctor now!</Text>
        <Text style={styles.subtitle}>Critical findings in your report.</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEEF0',
    borderWidth: 1,
    borderColor: '#FAD4D8',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C22F43',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#C22F43',
    opacity: 0.9,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '700',
    color: '#C22F43',
    marginLeft: 6,
  },
});
