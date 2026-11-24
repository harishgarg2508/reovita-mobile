import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tapSelection } from '@shared/lib';
import { useFormColors } from '@shared/ui/theme/form-colors';

import { useActiveProfile, useIsFamilyView, useOwnProfile, useSwitchProfile } from '../model/use-profile-switch';

// Shown at the top of the dashboard in a family view: whose health is on screen, that it is the health details only, and a way back to your own.
export function FamilyViewBanner() {
  const p = useFormColors();
  const familyView = useIsFamilyView();
  const active = useActiveProfile();
  const own = useOwnProfile();
  const switchTo = useSwitchProfile();
  if (!familyView || !active) return null;

  const name = active.nickname ?? active.codename;
  return (
    <View accessibilityRole="summary" style={[styles.banner, { backgroundColor: p.warnBg, borderColor: p.warnBorder }]}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: p.warnText }]}>
          <Ionicons name="people" size={16} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: p.text }]}>{`Viewing ${name}'s health`}</Text>
      </View>
      <Text style={[styles.sub, { color: p.muted }]}>Health details only. Social is not shown here.</Text>
      {own ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch back to your profile"
          disabled={switchTo.isPending}
          onPress={() => {
            tapSelection();
            switchTo.mutate(own.subject_id);
          }}
          style={[styles.back, { borderColor: p.warnText }]}>
          <Ionicons name="swap-horizontal" size={16} color={p.warnText} />
          <Text style={[styles.backText, { color: p.warnText }]}>Switch back to your health</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { gap: 10, padding: 14, borderRadius: 18, borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  sub: { fontSize: 12.5, lineHeight: 18 },
  back: { flexDirection: 'row', height: 40, gap: 8, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
});
