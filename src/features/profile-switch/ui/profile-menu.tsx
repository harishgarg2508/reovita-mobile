import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { usePalette, type Palette } from '@shared/ui/theme';
import { PremiumBadge, useSubscription } from '@entities/subscription';

import {
  useAccountProfiles,
  useSwitchProfile,
} from '../model/use-profile-switch';

// The list that opens from the profile card: the profiles of this account, the one in use ticked, and an "Add profile" row.
// Choosing another profile switches to it. It shows the nickname (or "You") and the codename, never a real name.
// onAdd opens the add-profile sheet on top of this list, which stays open under it.
export function ProfileMenu({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: () => void;
}) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  // Family profiles are Premium: on the free plan the row carries a Premium pill, and the page sends the person to the plan screen.
  const plan = useSubscription();
  const profiles = useAccountProfiles();
  const switchTo = useSwitchProfile();

  return (
    <View style={styles.menu}>
      {profiles.isPending ? (
        <ActivityIndicator color={p.accent} style={styles.loading} />
      ) : null}
      {(profiles.data ?? []).map((profile) => (
        <Pressable
          key={profile.subject_id}
          accessibilityRole="button"
          accessibilityState={{ selected: profile.is_active }}
          disabled={switchTo.isPending}
          onPress={() => {
            onClose();
            if (!profile.is_active) switchTo.mutate(profile.subject_id);
          }}
          style={[styles.row, profile.is_active && styles.rowOn]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.codename.split('-').pop()?.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.text}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.role === 'owner'
                ? 'You'
                : (profile.nickname ?? 'Family')}
            </Text>
            <Text style={styles.code}>{profile.codename}</Text>
          </View>
          {profile.is_active ? (
            <Ionicons name="checkmark-circle" size={20} color={p.accent} />
          ) : null}
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onAdd();
        }}
        style={[styles.row, styles.addRow]}
      >
        <View style={styles.addAvatar}>
          <Ionicons name="add" size={20} color={p.accent} />
        </View>
        <Text style={styles.addText}>Add profile</Text>
        {plan.locked ? <PremiumBadge /> : null}
      </Pressable>
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    menu: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.card,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    loading: { paddingVertical: 14 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rowOn: { backgroundColor: p.accentSoft },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.accentSoft,
    },
    avatarText: { fontSize: 13, fontWeight: '800', color: p.accent },
    text: { flex: 1, gap: 1 },
    name: { fontSize: 14.5, fontWeight: '700', color: p.textStrong },
    code: { fontSize: 12, color: p.muted },
    addRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
    },
    addAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: p.accent,
    },
    addText: { fontSize: 14.5, fontWeight: '700', color: p.accent },
  });
}
