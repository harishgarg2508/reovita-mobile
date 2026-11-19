import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette, type Palette } from '../theme';

export interface SwitcherProfile {
  id: string;
  // The codename, never a real name: a name must not appear next to health data.
  label: string;
  // Short line under the label, for example "You" or "Daughter".
  hint?: string;
}

// A dropdown that shows the active profile and, when opened, the other profiles and an "Add profile" row.
// Display only for now: it holds the open state, and the parent owns which profile is active.
export function ProfileSwitcher({
  profiles,
  activeId,
  onSelect,
  onAdd,
}: {
  profiles: SwitcherProfile[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const [open, setOpen] = useState(false);
  // With one profile and nothing to add there is nothing to choose, so the button only shows who is active.
  const expandable = profiles.length > 1 || Boolean(onAdd);
  const active =
    profiles.find((profile) => profile.id === activeId) ?? profiles[0];
  if (!active) return null;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Switch profile"
        onPress={() => setOpen((v) => !v)}
        disabled={!expandable}
        style={styles.trigger}
      >
        <Avatar profile={active} styles={styles} />
        <View style={styles.triggerText}>
          <Text style={styles.label} numberOfLines={1}>
            {active.label}
          </Text>
          {active.hint ? <Text style={styles.hint}>{active.hint}</Text> : null}
        </View>
        {expandable ? (
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={p.muted}
          />
        ) : null}
      </Pressable>

      {open && expandable ? (
        <>
          {/* A tap anywhere outside the list closes it. The layer is larger than the screen, so it covers everything around. */}
          <Pressable
            accessibilityLabel="Close profile list"
            onPress={() => setOpen(false)}
            style={styles.backdrop}
          />
          <View style={styles.menu}>
            {profiles.map((profile) => {
              const selected = profile.id === active.id;
              return (
                <Pressable
                  key={profile.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setOpen(false);
                    onSelect(profile.id);
                  }}
                  style={[styles.row, selected && styles.rowOn]}
                >
                  <Avatar profile={profile} styles={styles} />
                  <View style={styles.triggerText}>
                    <Text style={styles.label} numberOfLines={1}>
                      {profile.label}
                    </Text>
                    {profile.hint ? (
                      <Text style={styles.hint}>{profile.hint}</Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={p.accent}
                    />
                  ) : null}
                </Pressable>
              );
            })}
            {onAdd ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setOpen(false);
                  onAdd();
                }}
                style={[styles.row, styles.addRow]}
              >
                <View style={[styles.avatar, styles.addAvatar]}>
                  <Ionicons name="add" size={20} color={p.accent} />
                </View>
                <Text style={[styles.label, { color: p.accent }]}>
                  Add profile
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Avatar({
  profile,
  styles,
}: {
  profile: SwitcherProfile;
  styles: Styles;
}) {
  // The first letters of the codename's last part, for example "AQ" from VT-4762-AQ.
  const initials =
    profile.label.split('-').pop()?.slice(0, 2).toUpperCase() ?? '?';
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    // The list floats over the page below the button (a popover), so opening it does not move anything else.
    wrap: { position: 'relative', zIndex: 50, elevation: 50 },
    backdrop: {
      position: 'absolute',
      top: -3000,
      bottom: -3000,
      left: -1000,
      right: -1000,
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.card,
    },
    triggerText: { flex: 1, gap: 1 },
    label: { fontSize: 14.5, fontWeight: '700', color: p.textStrong },
    hint: { fontSize: 12, color: p.muted },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: p.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 13, fontWeight: '800', color: p.accent },
    menu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 6,
      zIndex: 60,
      elevation: 12,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.card,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    rowOn: { backgroundColor: p.accentSoft },
    addRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
    },
    addAvatar: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: p.accent,
      borderStyle: 'dashed',
    },
  });
}
