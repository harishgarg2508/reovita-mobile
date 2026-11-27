import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAccountIdentity } from '@entities/session';
import { useActiveProfile, useIsFamilyView } from '@features/profile-switch';
import { SocialAvatar, useMyHandle } from '@entities/social';
import { useChangeAvatar } from '@features/social';
import { useCurrentSubject } from '@entities/subject';
import { tapSelection } from '@shared/lib';
import { Type, usePalette } from '@shared/ui/theme';

// The greeting at the top of the dashboard: the picture, the greeting for the time of day, and the name of the person who is signed in. The name is the one on their
// own Google account, with the picture of that account, shown on their own phone; this is the only place they are read (see useAccountIdentity). When there is no name, the
// codename is shown, and when there is no picture (or it cannot be loaded) the Social picture or a plain person icon takes its place.
export function DashboardGreeting() {
  const p = usePalette();
  const { displayName, photoUrl } = useAccountIdentity();
  // A picture that fails to load (offline, or removed) is dropped for the fallback.
  const [photoFailed, setPhotoFailed] = useState(false);
  const subject = useCurrentSubject();
  const handle = useMyHandle();
  // In a family view the greeting is about the family member: their nickname (or codename), with their initial, and no account picture.
  const familyView = useIsFamilyView();
  const activeProfile = useActiveProfile();
  // The family member is named by the nickname the family gave, then the codename. Their Google name is never shown in a family view.
  const memberName = activeProfile?.nickname ?? activeProfile?.codename;
  const name = familyView && memberName ? memberName : (displayName ?? subject.data?.codename ?? 'Welcome');
  const avatar = useChangeAvatar(handle.joined && handle.data ? handle.data.handle : null);
  // The Google account picture is the one shown. The Social picture only stands in when there is no Google picture (or it fails to load).
  const showGooglePhoto = !familyView && Boolean(photoUrl) && !photoFailed;
  const hasSocialPhoto = handle.joined && handle.data?.has_avatar === true;

  // Changing or removing applies to the Social picture, so the menu is offered only when that picture is the one shown.
  function onPicturePress() {
    tapSelection();
    if (showGooglePhoto || !handle.joined || !handle.data) return;
    Alert.alert('Profile picture', 'Choose what to do with your picture.', [
      { text: 'Change picture', onPress: () => void avatar.change() },
      ...(hasSocialPhoto ? [{ text: 'Remove picture', style: 'destructive' as const, onPress: () => avatar.remove() }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change profile picture"
        disabled={avatar.busy}
        onPress={onPicturePress}
        style={[styles.ring, { borderColor: p.accent }]}>
        {familyView ? (
          <View style={[styles.fallback, { backgroundColor: p.accentSoft }]}>
            <Text style={[Type.title, { color: p.accent }]}>{name.slice(0, 1).toUpperCase()}</Text>
          </View>
        ) : showGooglePhoto && photoUrl ? (
          <Image source={{ uri: photoUrl }} onError={() => setPhotoFailed(true)} style={styles.photo} resizeMode="cover" accessibilityLabel="Your Google account picture" />
        ) : hasSocialPhoto ? (
          <SocialAvatar handle={handle.data?.handle ?? ''} hasAvatar size={42} />
        ) : handle.joined && handle.data ? (
          <SocialAvatar handle={handle.data.handle} hasAvatar={false} size={42} />
        ) : (
          <View style={[styles.fallback, { backgroundColor: p.accentSoft }]}>
            <Ionicons name="person" size={22} color={p.accent} />
          </View>
        )}
      </Pressable>
      <View style={styles.text}>
        <Text style={[Type.small, { color: p.muted }]}>{familyView ? 'Family health' : `${greeting()},`}</Text>
        <Text numberOfLines={1} style={[Type.title, styles.name, { color: p.text }]}>
          {name}
        </Text>
      </View>
    </View>
  );
}

// The greeting for the time of day on this phone.
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  row: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring: { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  photo: { width: 42, height: 42, borderRadius: 21 },
  fallback: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  name: { fontSize: 18 },
});
