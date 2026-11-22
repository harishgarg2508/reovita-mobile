import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCurrentSubject } from '@entities/subject';
import { usePalette, type Palette } from '@shared/ui/theme';

import { ageFrom, sexLabel } from '../model/profile-details.format';
import { useProfileStepSaved } from '../model/use-profile-details';

// Who this profile is: a round badge with the last letters of the codename, the codename itself, a "You" tag, and one line with age and
// sex. It shows the codename and never the real name, because a name must not sit next to health data.
export function ProfileIdentityCard({
  tag = 'You',
}: {
  // The small tag after the codename: "You" for the account's own profile, the nickname for a family profile.
  tag?: string;
}) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const subject = useCurrentSubject();
  const basics = useProfileStepSaved(1);

  const codename = subject.data?.codename;
  if (!codename) return null;

  const initials = codename.split('-').pop()?.slice(0, 2).toUpperCase() ?? '?';
  const age = ageFrom(basics.data?.birth_year);
  const sex = sexLabel(basics.data?.sex);
  const line = [age !== null ? `${age} yrs` : null, sex]
    .filter(Boolean)
    .join('  •  ');

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{initials}</Text>
        </View>
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Text style={styles.codename} numberOfLines={1}>
              {codename}
            </Text>
            <View style={styles.youTag}>
              <Text style={styles.youText} numberOfLines={1}>
                {tag}
              </Text>
            </View>
          </View>
          {line ? <Text style={styles.line}>{line}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    wrap: { position: 'relative', zIndex: 50, elevation: 50 },
    backdrop: {
      position: 'absolute',
      top: -3000,
      bottom: -3000,
      left: -1000,
      right: -1000,
    },
    menu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 8,
      zIndex: 60,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.card,
    },
    badge: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.accentSoft,
      borderWidth: 2,
      borderColor: p.card,
      shadowColor: p.accent,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    badgeText: { fontSize: 17, fontWeight: '800', color: p.accent },
    text: { flex: 1, gap: 3 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    codename: {
      flexShrink: 1,
      fontSize: 17,
      fontWeight: '800',
      color: p.textStrong,
      letterSpacing: 0.3,
    },
    youTag: {
      paddingHorizontal: 9,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: p.accentSoft,
      borderWidth: 1,
      borderColor: p.accent,
    },
    youText: { fontSize: 11.5, fontWeight: '800', color: p.accent },
    line: { fontSize: 13, color: p.muted },
    switchBtn: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.surface,
    },
  });
}
