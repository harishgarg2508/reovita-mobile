import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette, type Palette } from '@shared/ui/theme';

import { useIncomingAccess } from '../model/use-access-requests';

// Shown to the subject when someone scans their code. Nothing about them is shown to the viewer until the subject
// allows it. The request expires after about a minute if it is not answered.
export function AccessRequestPrompt() {
  const p = usePalette();
  const styles = makeStyles(p);
  const { incoming, decide } = useIncomingAccess();
  const next = incoming.data?.[0];

  return (
    <Modal visible={!!next} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => undefined}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Someone wants to read your information</Text>
          <Text style={styles.body}>
            Someone scanned your code and asked to see your health summary. Allow only if you know this person and want them to see it.
          </Text>
          <Text style={styles.note}>The summary includes your conditions, lifestyle and health score. You can stop it at any time.</Text>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              disabled={decide.isPending}
              onPress={() => next && decide.mutate({ id: next.id, allow: false })}
              style={[styles.btn, styles.deny]}>
              <Text style={styles.denyText}>Deny</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={decide.isPending}
              onPress={() => next && decide.mutate({ id: next.id, allow: true })}
              style={[styles.btn, styles.allow]}>
              <Text style={styles.allowText}>Allow</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: p.bg, justifyContent: 'center', padding: 22 },
    sheet: { backgroundColor: p.card, borderRadius: 24, borderWidth: 1, borderColor: p.border, padding: 22, gap: 12 },
    title: { fontSize: 18, fontWeight: '800', color: p.textStrong },
    body: { fontSize: 14, lineHeight: 20, color: p.text },
    note: { fontSize: 12.5, lineHeight: 18, color: p.muted },
    row: { flexDirection: 'row', gap: 12, marginTop: 6 },
    btn: { flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    deny: { borderWidth: 1.5, borderColor: '#C22F43' },
    denyText: { fontSize: 15, fontWeight: '700', color: '#C22F43' },
    allow: { backgroundColor: p.accent },
    allowText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  });
}
