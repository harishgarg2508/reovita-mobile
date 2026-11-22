import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';

import { useStepState } from '../model/use-step-tracking';

// A slim banner under the top bar of the screens that run on steps, shown only on a device that cannot count steps (a browser, or a phone without the
// sensor). It stays in place while the screen scrolls.
export function StepsBanner() {
  const p = usePalette();
  const steps = useStepState();
  if (!steps.ready || steps.available) return null;
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: p.accentSoft, borderColor: p.border }]}>
      <Ionicons name="footsteps-outline" size={18} color={p.accent} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: p.text }]}>Steps need the phone app</Text>
        <Text style={[styles.body, { color: p.muted }]}>This device cannot count steps. Open Reovita on your phone and turn on step counting to move along your journeys.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 13.5, fontWeight: '800' },
  body: { fontSize: 12, lineHeight: 17 },
});
