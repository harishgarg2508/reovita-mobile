import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapSelection } from '@shared/lib';
import { useFormColors } from '@shared/ui/theme/form-colors';

import { useActiveProfile, useOwnProfile, useSwitchProfile } from '../model/use-profile-switch';

// The bar at the bottom of a family view, in place of the main dock: whose health is on screen, and one button back to your own.
export function FamilySwitchBackDock() {
  const p = useFormColors();
  const insets = useSafeAreaInsets();
  const active = useActiveProfile();
  const own = useOwnProfile();
  const switchTo = useSwitchProfile();
  if (!active || !own) return null;

  const name = active.nickname ?? active.codename;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View accessibilityRole="toolbar" style={[styles.bar, { backgroundColor: p.card, borderColor: p.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch back to your profile from ${name}`}
          disabled={switchTo.isPending}
          onPress={() => {
            tapSelection();
            switchTo.mutate(own.subject_id);
          }}
          style={[styles.button, { backgroundColor: p.warnText }]}>
          <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
          <Text style={styles.buttonText}>Switch back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, alignItems: 'center' },
  bar: { flexDirection: 'row', justifyContent: 'center', padding: 6, borderRadius: 32, borderWidth: 1, elevation: 6 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
});
