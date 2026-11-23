import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@shared/ui';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_RULE, SOCIAL_SPACE, SOCIAL_TYPE, useMyHandle, useSocialProfile, useSocialUnread } from '@entities/social';

import { pickPicture } from '../model/pick-picture';
import { SOCIAL_HOME, socialProfileHref, socialRoute } from '../model/routes';
import { useLeaveSocial, useSetPicture } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { useScrollToTopOnFocus } from '@shared/lib';

type Row = { icon: keyof typeof Ionicons.glyphMap; label: string; hint?: string; badge?: number; href: Href };

// The settings of the social account, opened from the menu button on my profile: my saved posts, my activity, the app's notifications, friend
// requests, the blocked and reported people, and deleting the social account. Deleting asks first, and removes only the social account.
export function SocialSettingsScreen() {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const profile = useSocialProfile(me.data?.handle ?? '', me.joined);
  const unread = useSocialUnread(me.joined);
  const leave = useLeaveSocial();
  const [confirming, setConfirming] = useState(false);
  // Removing the profile photo or the cover asks first. They are managed here, not in the edit drawer.
  const avatarPicture = useSetPicture('avatar');
  const coverPicture = useSetPicture('cover');
  const removeAvatar = avatarPicture.remove;
  const removeCover = coverPicture.remove;
  // The "My profile" dropdown, and why a photo could not be picked.
  const [profileOpen, setProfileOpen] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<'avatar' | 'cover' | null>(null);
  const hasAvatar = profile.data?.has_avatar === true;
  const hasCover = profile.data?.has_cover === true;

  // Picks a photo from the phone and sets it as the profile photo or the cover.
  async function change(kind: 'avatar' | 'cover') {
    const handle = me.data?.handle;
    if (!handle) return;
    setPictureError(null);
    try {
      const picked = await pickPicture();
      if (picked) (kind === 'avatar' ? avatarPicture : coverPicture).set.mutate({ handle, photo: picked });
    } catch (err) {
      setPictureError((err as Error).message);
    }
  }
  const changing = avatarPicture.set.isPending || coverPicture.set.isPending;

  const blocked = profile.data?.blocked_count;
  // Only what is about the person's own Social: the saved posts, and the notifications of Social (kudos, comments, requests, invitations), which open on Activity.
  // Journeys, pods and quests are in Move; friend requests and kudos are in Activity.
  const rows: Row[] = [
    { icon: 'bookmark-outline', label: 'Saved posts', hint: 'Posts you kept with the bookmark', href: socialRoute('/social/saved') },
    { icon: 'notifications-outline', label: 'Notifications', hint: 'Kudos, comments, requests and invitations', badge: (unread.data?.unread ?? 0) + (unread.data?.requests ?? 0), href: socialRoute('/social/activity') },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => goBackOr(router, SOCIAL_HOME)} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={p.text} />
        </Pressable>
        <View style={styles.iconBtn} />
      </View>
      <View style={styles.heading}>
        <Text style={[SOCIAL_TYPE.display, { color: p.text }]}>Settings</Text>
      </View>

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { borderTopColor: p.border }]}>
            {rows.map((row, index) => (
              <Pressable
                key={row.label}
                accessibilityRole="button"
                onPress={() => router.push(row.href)}
                style={[styles.row, { borderBottomWidth: SOCIAL_RULE, borderBottomColor: p.border }]}>
                <View style={styles.iconBox}>
                  <Ionicons name={row.icon} size={19} color={p.accent} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: p.text }]}>{row.label}</Text>
                  {row.hint ? <Text numberOfLines={1} style={[styles.rowHint, { color: p.muted }]}>{row.hint}</Text> : null}
                </View>
                {row.badge ? (
                  <View style={[styles.badge, { backgroundColor: p.red }]}>
                    <Text style={styles.badgeText}>{row.badge > 99 ? '99+' : row.badge}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={p.muted} />
              </Pressable>
            ))}
          </View>

          {/* My profile: a dropdown with the ways to change the name, the profile photo and the cover. */}
          <View style={[styles.card, { borderTopColor: p.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: profileOpen }}
              onPress={() => setProfileOpen((v) => !v)}
              style={[styles.row, { borderBottomWidth: SOCIAL_RULE, borderBottomColor: p.border }]}>
              <View style={styles.iconBox}>
                <Ionicons name="person-outline" size={19} color={p.accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: p.text }]}>My profile</Text>
                <Text numberOfLines={1} style={[styles.rowHint, { color: p.muted }]}>Name, bio, profile photo and cover</Text>
              </View>
              <Ionicons name={profileOpen ? 'chevron-up' : 'chevron-down'} size={18} color={p.muted} />
            </Pressable>
            {profileOpen ? (
              <View style={styles.dropdown}>
                <ProfileOption icon="create-outline" label="Edit name and bio" color={p.text} iconColor={p.accent} border={p.border} onPress={() => router.push(socialProfileHref(me.data?.handle ?? ''))} />
                <ProfileOption icon="camera-outline" label={hasAvatar ? 'Change profile photo' : 'Add profile photo'} color={p.text} iconColor={p.accent} border={p.border} busy={avatarPicture.set.isPending} disabled={changing} onPress={() => void change('avatar')} />
                <ProfileOption icon="image-outline" label={hasCover ? 'Change cover' : 'Add cover'} color={p.text} iconColor={p.accent} border={p.border} busy={coverPicture.set.isPending} disabled={changing} onPress={() => void change('cover')} />
                {hasAvatar ? <ProfileOption icon="trash-outline" label="Remove profile photo" color={p.red} iconColor={p.red} border={p.border} onPress={() => setRemoving('avatar')} /> : null}
                {hasCover ? <ProfileOption icon="trash-outline" label="Remove cover" color={p.red} iconColor={p.red} border={p.border} onPress={() => setRemoving('cover')} /> : null}
                {pictureError ? <Text style={[styles.rowHint, { color: p.red }, styles.dropdownError]}>{pictureError}</Text> : null}
              </View>
            ) : null}
          </View>

          <View style={[styles.card, { borderTopColor: p.border }]}>
            <Pressable accessibilityRole="button" onPress={() => router.push(socialRoute('/social/blocked'))} style={[styles.row, { borderBottomWidth: SOCIAL_RULE, borderBottomColor: p.border }]}>
              <View style={styles.iconBox}>
                <Ionicons name="ban-outline" size={19} color={p.accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: p.text }]}>Blocked and reported</Text>
                <Text numberOfLines={1} style={[styles.rowHint, { color: p.muted }]}>{typeof blocked === 'number' ? `${blocked} blocked` : 'People you blocked or reported'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={p.muted} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={styles.row}>
              <View style={styles.iconBox}>
                <Ionicons name="trash-outline" size={19} color={p.red} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: p.red }]}>Delete account</Text>
                <Text numberOfLines={1} style={[styles.rowHint, { color: p.muted }]}>Removes your social account only</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <ConfirmDialog
        visible={removing !== null}
        title={removing === 'cover' ? 'Remove cover?' : 'Remove profile photo?'}
        message={removing === 'cover' ? 'Your cover picture is removed from your profile.' : 'Your profile photo is removed. Your profile shows the default picture again.'}
        confirmLabel="Remove"
        busy={removeAvatar.isPending || removeCover.isPending}
        onConfirm={() => {
          const handle = me.data?.handle;
          if (!handle || !removing) return;
          (removing === 'cover' ? removeCover : removeAvatar).mutate(handle, { onSettled: () => setRemoving(null) });
        }}
        onCancel={() => setRemoving(null)}
      />
      <ConfirmDialog
        visible={confirming}
        title="Delete account?"
        message="Your social account is deleted: your handle, posts, kudos, friends and photos. Your health information and your Reovita account are not affected. You can create a new social account later with a new handle."
        confirmLabel="Delete"
        busy={leave.isPending}
        onConfirm={() => leave.mutate(undefined, { onSuccess: () => router.replace(SOCIAL_HOME), onSettled: () => setConfirming(false) })}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

// One option inside the My profile dropdown.
function ProfileOption({ icon, label, color, iconColor, border, onPress, busy = false, disabled = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; iconColor: string; border: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled }} disabled={disabled} onPress={onPress} style={[styles.option, { borderBottomColor: border, opacity: disabled && !busy ? 0.5 : 1 }]}>
      <View style={styles.iconBox}>
        {busy ? <ActivityIndicator size="small" color={iconColor} /> : <Ionicons name={icon} size={18} color={iconColor} />}
      </View>
      <Text style={[styles.optionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dropdown: { paddingLeft: 18 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, paddingVertical: 14, borderBottomWidth: SOCIAL_RULE },
  optionLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14.5, lineHeight: 20 },
  dropdownError: { paddingVertical: 8, paddingHorizontal: 4 },
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { paddingHorizontal: SOCIAL_SPACE.edge, paddingBottom: SOCIAL_SPACE.inner, gap: 2 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  // Keeps the title in the middle without drawing anything on the right.
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontWeight: '800' },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  card: { borderTopWidth: SOCIAL_RULE },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, paddingVertical: 16 },
  iconBox: { width: 28, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
  rowLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 15.5, lineHeight: 22 },
  rowHint: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, lineHeight: 17 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' },
});
