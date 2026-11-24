import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useAccountIdentity } from '@entities/session';
import { SocialAvatar, useMyHandle } from '@entities/social';
import { useCurrentSubject } from '@entities/subject';
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
  const name = displayName ?? subject.data?.codename ?? 'Welcome';

  return (
    <View style={styles.row}>
      <View style={[styles.ring, { borderColor: p.accent }]}>
        {photoUrl && !photoFailed ? (
          <Image source={{ uri: photoUrl }} onError={() => setPhotoFailed(true)} style={styles.photo} resizeMode="cover" accessibilityLabel="Your Google account picture" />
        ) : handle.joined && handle.data ? (
          <SocialAvatar handle={handle.data.handle} hasAvatar={handle.data.has_avatar} size={42} />
        ) : (
          <View style={[styles.fallback, { backgroundColor: p.accentSoft }]}>
            <Ionicons name="person" size={22} color={p.accent} />
          </View>
        )}
      </View>
      <View style={styles.text}>
        <Text style={[Type.small, { color: p.muted }]}>{greeting()},</Text>
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
