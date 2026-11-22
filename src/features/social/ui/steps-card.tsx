import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { tapConfirm } from '@shared/lib';
import { usePalette } from '@shared/ui/theme';

import { disableStepCounting, enableStepCounting, refreshStepPermission, useStepState } from '../model/use-step-tracking';

// Where journey distance comes from. Only steps move a person: the phone counts them, with the person's permission. The card asks
// for that permission only when the person taps the button, and says what is read: a number of steps, never a position.
export function StepsCard() {
  const p = usePalette();
  const steps = useStepState();
  const [busy, setBusy] = useState(false);

  if (!steps.ready) return null;

  async function turnOn() {
    tapConfirm();
    setBusy(true);
    await enableStepCounting();
    setBusy(false);
  }

  // A device that cannot count steps is told in the banner under the top bar (StepsBanner), not here.
  if (!steps.available) return null;

  if (steps.enabled) {
    return (
      <View style={[styles.card, { backgroundColor: p.card, borderColor: p.accent }]}>
        <View style={styles.row}>
          <Ionicons name="footsteps" size={20} color={p.accent} />
          <Text style={[styles.title, styles.flex, { color: p.text }]}>Counting your steps</Text>
          <Text style={[styles.count, { color: p.accent }]}>{steps.today.toLocaleString('en-IN')}</Text>
        </View>
        <Text style={[styles.hint, { color: p.muted }]}>Steps today move you along your journeys. 7,000 steps is a full day on the route. Only the step number is kept, never where you walked. Counting runs while the app is open.</Text>
        <Pressable accessibilityRole="button" onPress={() => void disableStepCounting()} hitSlop={6}>
          <Text style={[styles.link, { color: p.muted }]}>Turn off step counting</Text>
        </Pressable>
      </View>
    );
  }

  const blocked = steps.permission === 'denied' && !steps.canAskAgain;
  const lost = steps.wanted && !steps.enabled;
  return (
    <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
      <View style={styles.row}>
        <Ionicons name="footsteps-outline" size={20} color={p.accent} />
        <Text style={[styles.title, { color: p.text }]}>{lost ? 'Step counting is paused' : 'Move with your real steps'}</Text>
      </View>
      <Text style={[styles.hint, { color: p.muted }]}>
        {lost ? 'The activity permission is missing, so your steps are not being counted. Allow it to carry on. ' : ''}Let the app count your steps so a walk or a trek moves you along the route. Only the number of steps is used. Your location is never read, and you can turn it off any time.
      </Text>
      {blocked ? (
        <>
          <Text style={[styles.hint, { color: p.muted }]}>The activity permission is off for this app. Allow it in the phone settings, then come back.</Text>
          <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={[styles.btn, { backgroundColor: p.accent }]}>
            <Text style={styles.btnText}>Open phone settings</Text>
          </Pressable>
        </>
      ) : (
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void turnOn().then(() => refreshStepPermission(false))} style={[styles.btn, { backgroundColor: p.accent }]}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Allow step counting</Text>}
        </Pressable>
      )}
      {steps.permission === 'denied' && !blocked ? <Text style={[styles.hint, { color: p.muted }]}>Without the permission your journeys stay at the start, because only steps move you.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 20, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800' },
  count: { fontSize: 20, fontWeight: '800' },
  hint: { fontSize: 12.5, lineHeight: 18 },
  link: { fontSize: 12.5, fontWeight: '700', textDecorationLine: 'underline' },
  btn: { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
