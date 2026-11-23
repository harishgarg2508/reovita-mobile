import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Gap, Rule, Type, usePalette, type Palette } from '@shared/ui/theme';
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
    // Flat rows on thin rules: the list is not a card.
    menu: { borderTopWidth: Rule, borderTopColor: p.border, marginTop: Gap.inner },
    loading: { paddingVertical: 14 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      borderBottomWidth: Rule,
      borderBottomColor: p.border,
    },
    rowOn: {},
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.accentSoft,
    },
    avatarText: { ...Type.label, fontFamily: 'Poppins_600SemiBold', color: p.accent },
    text: { flex: 1, gap: 1 },
    name: { ...Type.bodyStrong, color: p.textStrong },
    code: { ...Type.small, color: p.muted },
    addRow: { borderBottomWidth: 0 },
    addAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: p.accent,
    },
    addText: { ...Type.bodyStrong, color: p.accent },
  });
}
