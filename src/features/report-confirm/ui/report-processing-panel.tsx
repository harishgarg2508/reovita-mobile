import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Shown while the server reads the report. The status comes from the event stream, so the screen
// does not poll. The user can leave and is notified when the observations are ready.
export function ReportProcessingPanel({ onLater }: { onLater: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 24, paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
      <Text style={styles.title}>Your report is being read</Text>
      <Text style={styles.body}>
        This usually takes a minute or two. You can leave this screen. We will notify you when your observations are ready.
      </Text>
      <View style={styles.spacer} />
      <Pressable accessibilityRole="button" onPress={onLater} style={styles.button}>
        <Text style={styles.buttonText}>Come back later</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, gap: 16, backgroundColor: '#FFFFFF' },
  title: { fontSize: 22, fontWeight: '700', color: '#1F1A2E' },
  body: { fontSize: 14, lineHeight: 20, color: '#5B5470' },
  spacer: { flex: 1 },
  button: { backgroundColor: '#1F6F3F', borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
