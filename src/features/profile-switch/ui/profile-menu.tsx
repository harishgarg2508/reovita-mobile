import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
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
  useUnlinkProfile,
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
  const unlink = useUnlinkProfile();
  // Asks before a linked account is taken off this account. Its own sign-in and data stay.
  function confirmUnlink(subject_id: string, label: string) {
    Alert.alert('Stop managing this account?', `${label} will no longer open from here. Their own sign-in, profile and data stay as they are.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop managing', style: 'destructive', onPress: () => unlink.mutate(subject_id) },
    ]);
  }

  return (
    <View style={styles.menu}>
      {profiles.isPending ? (
        <ActivityIndicator color={p.accent} style={styles.loading} />
      ) : null}
      {(profiles.data ?? []).map((profile) => (
        // The row is not itself a button: the switch and the unlink icon are two buttons side by side (a button can not hold another).
        <View key={profile.subject_id} style={[styles.row, profile.is_active && styles.rowOn, profile.view_only && styles.rowLocked]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={profile.view_only ? `${profile.codename}, family member, view only` : undefined}
          accessibilityState={{ selected: profile.is_active, disabled: profile.view_only || switchTo.isPending }}
          disabled={switchTo.isPending || profile.view_only}
          onPress={() => {
            onClose();
            if (!profile.is_active && !profile.view_only) switchTo.mutate(profile.subject_id);
          }}
          style={styles.rowMain}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.codename.split('-').pop()?.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.text}>
            {/* The Google name of the account is the label; the family's nickname comes under it, then the codename. */}
            <Text style={styles.name} numberOfLines={1}>
              {profile.display_name ?? profile.nickname ?? (profile.role === 'owner' && !profile.view_only ? 'You' : 'Family member')}
            </Text>
            {profile.nickname && profile.nickname !== (profile.display_name ?? profile.nickname) ? (
              <Text style={styles.code} numberOfLines={1}>
                {profile.nickname}
              </Text>
            ) : null}
            <Text style={styles.code}>
              {profile.view_only ? `${profile.codename} · view only` : profile.linked ? `${profile.codename} · added by you` : profile.codename}
            </Text>
          </View>
          {profile.is_active ? (
            <Ionicons name="checkmark-circle" size={20} color={p.accent} />
          ) : null}
        </Pressable>
        {profile.linked && !profile.is_active ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Stop managing ${profile.nickname ?? profile.codename}`}
            hitSlop={10}
            onPress={() => confirmUnlink(profile.subject_id, profile.nickname ?? profile.codename)}
          >
            <Ionicons name="unlink-outline" size={18} color={p.muted} />
          </Pressable>
        ) : null}
        </View>
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
    // The part of a row that switches profile: it takes the room, so the unlink icon sits at the right.
    rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      borderBottomWidth: Rule,
      borderBottomColor: p.border,
    },
    rowLocked: { opacity: 0.6 },
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
