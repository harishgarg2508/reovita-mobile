import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@shared/ui/theme';

import { useStepState } from '../model/use-step-tracking';

// Covers a screen that depends on steps (journeys, pods) when the person turned step counting on but the phone will not ask for the permission again
// (they chose "do not ask again", or took it away in the settings). It blurs what is behind it, says why, and opens the phone settings. It goes away by
// itself when the permission is back: the app checks it each time it comes to the front. The top bar stays free so the person can still go back.
export function StepsPermissionOverlay() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const steps = useStepState();
  const blocked = steps.ready && steps.available && steps.wanted && !steps.enabled && steps.permission === 'denied' && !steps.canAskAgain;
  if (!blocked) return null;

  // On the web the blur is a real blur of what is behind; on a phone it is a strong tint.
  const blur = Platform.OS === 'web' ? ({ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } as unknown as ViewStyle) : null;
  return (
    <View style={[styles.cover, { top: Math.max(insets.top, 20) + 60, backgroundColor: Platform.OS === 'web' ? `${p.bg}CC` : `${p.bg}F2` }, blur]}>
      <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
        <View style={[styles.icon, { backgroundColor: p.accentSoft }]}>
          <Ionicons name="footsteps" size={26} color={p.accent} />
        </View>
        <Text style={[styles.title, { color: p.text }]}>Allow activity access</Text>
        <Text style={[styles.body, { color: p.muted }]}>
          Journeys and pods move with your steps, but the phone is blocking step counting for this app. Allow Physical activity in the settings, then come back. Only the number of steps is used, never where you are.
        </Text>
        <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={[styles.btn, { backgroundColor: p.accent }]}>
          <Text style={styles.btnText}>Open phone settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 20 },
  card: { width: '100%', maxWidth: 420, borderWidth: 1, borderRadius: 24, padding: 20, alignItems: 'center', gap: 12 },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  body: { fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  btn: { alignSelf: 'stretch', height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
